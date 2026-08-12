// Staff portal controller: own profile, shift offers, timesheets.
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');
const { billableHours } = require('../utils/time');
const { saveDataUrl } = require('../utils/media');

async function requireStaff(userId) {
  const staff = await prisma.staff.findUnique({ where: { userId } });
  if (!staff) throw ApiError.notFound('Staff profile not found');
  return staff;
}

/** GET /api/staff/me — profile + assignments + documents */
async function me(req, res) {
  const staff = await prisma.staff.findUnique({
    where: { userId: req.user.id },
    include: {
      skills: true,
      documents: true,
      assignments: {
        orderBy: { createdAt: 'desc' },
        include: { shift: { include: { client: true } } },
      },
    },
  });
  if (!staff) throw ApiError.notFound('Staff profile not found');
  res.json({ staff });
}

/** POST /api/staff/me/photo  { photo }  — employee uploads their own profile photo */
async function uploadPhoto(req, res) {
  const staff = await requireStaff(req.user.id);
  if (!req.body.photo) throw ApiError.badRequest('No photo provided');
  const photoUrl = saveDataUrl(req.body.photo, `staff-${staff.id.slice(0, 6)}`, 'profiles');
  const updated = await prisma.staff.update({ where: { id: staff.id }, data: { photoUrl } });
  res.json({ photoUrl: updated.photoUrl });
}

/** POST /api/staff/assignments/:id/respond  { accept } */
async function respond(req, res) {
  const staff = await requireStaff(req.user.id);
  const assignment = await prisma.shiftAssignment.findUnique({ where: { id: req.params.id } });
  if (!assignment || assignment.staffId !== staff.id) throw ApiError.notFound('Assignment not found');

  const status = req.body.accept ? 'ACCEPTED' : 'DECLINED';
  const updated = await prisma.shiftAssignment.update({
    where: { id: assignment.id },
    data: { status, respondedAt: new Date() },
  });

  // If accepted and the shift now has enough confirmed staff, mark it filled.
  if (req.body.accept) {
    const shift = await prisma.shift.findUnique({
      where: { id: assignment.shiftId },
      include: { assignments: true },
    });
    const accepted = shift.assignments.filter((a) => ['ACCEPTED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status)).length;
    if (accepted >= (shift.headcount || 1)) {
      await prisma.shift.update({ where: { id: shift.id }, data: { status: 'FILLED' } });
    }
  }
  res.json({ assignment: updated });
}

/** GET /api/staff/me/timesheets */
async function listTimesheets(req, res) {
  const staff = await requireStaff(req.user.id);
  const timesheets = await prisma.staffTimesheet.findMany({
    where: { staffId: staff.id },
    orderBy: { workDate: 'desc' },
  });
  res.json({ timesheets });
}

/** POST /api/staff/timesheets  { shiftAssignmentId?, workDate, startTime, endTime, breakMinutes?, notes? } */
async function submitTimesheet(req, res) {
  const staff = await requireStaff(req.user.id);
  const { shiftAssignmentId, workDate, startTime, endTime, breakMinutes = 0, notes } = req.body;
  if (!workDate || !startTime || !endTime) {
    throw ApiError.badRequest('workDate, startTime and endTime are required');
  }
  const hours = billableHours(startTime, endTime, Number(breakMinutes) || 0);
  const timesheet = await prisma.staffTimesheet.create({
    data: {
      staffId: staff.id,
      shiftAssignmentId: shiftAssignmentId || null,
      workDate: new Date(workDate),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      breakMinutes: Number(breakMinutes) || 0,
      hoursWorked: hours,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      notes,
    },
  });
  res.status(201).json({ timesheet });
}

/** POST /api/staff/assignments/:id/clock-in  { lat?, lng?, photo?, consent? } */
async function clockIn(req, res) {
  const staff = await requireStaff(req.user.id);
  const a = await prisma.shiftAssignment.findUnique({ where: { id: req.params.id } });
  if (!a || a.staffId !== staff.id) throw ApiError.notFound('Assignment not found');
  if (!['ACCEPTED', 'CONFIRMED'].includes(a.status)) throw ApiError.badRequest('You can only clock in on an accepted shift');
  // POPIA: a selfie is biometric personal information — require explicit consent.
  if (req.body.photo && !req.body.consent) throw ApiError.badRequest('Please accept the photo & location consent to clock in');

  const photoUrl = saveDataUrl(req.body.photo, `checkin-${a.id.slice(0, 6)}`);
  const updated = await prisma.shiftAssignment.update({
    where: { id: a.id },
    data: {
      status: 'CHECKED_IN',
      checkInAt: new Date(),
      checkInLat: req.body.lat ?? null,
      checkInLng: req.body.lng ?? null,
      checkInPhoto: photoUrl,
      attendanceConsentAt: req.body.consent ? new Date() : a.attendanceConsentAt ?? null,
    },
  });
  res.json({ assignment: { id: updated.id, status: updated.status, checkInAt: updated.checkInAt } });
}

/** POST /api/staff/assignments/:id/clock-out  { lat?, lng?, photo?, consent? }  — auto-builds the timesheet */
async function clockOut(req, res) {
  const staff = await requireStaff(req.user.id);
  const a = await prisma.shiftAssignment.findUnique({ where: { id: req.params.id } });
  if (!a || a.staffId !== staff.id) throw ApiError.notFound('Assignment not found');
  if (a.status !== 'CHECKED_IN' || !a.checkInAt) throw ApiError.badRequest('You need to clock in first');
  if (req.body.photo && !req.body.consent && !a.attendanceConsentAt) throw ApiError.badRequest('Please accept the photo & location consent to clock out');

  const now = new Date();
  const photoUrl = saveDataUrl(req.body.photo, `checkout-${a.id.slice(0, 6)}`);
  await prisma.shiftAssignment.update({
    where: { id: a.id },
    data: { status: 'COMPLETED', checkOutAt: now, checkOutLat: req.body.lat ?? null, checkOutLng: req.body.lng ?? null, checkOutPhoto: photoUrl },
  });

  const hours = billableHours(a.checkInAt, now, 0);
  const timesheet = await prisma.staffTimesheet.upsert({
    where: { shiftAssignmentId: a.id },
    update: { workDate: a.checkInAt, startTime: a.checkInAt, endTime: now, hoursWorked: hours, status: 'SUBMITTED', submittedAt: now },
    create: { staffId: staff.id, shiftAssignmentId: a.id, workDate: a.checkInAt, startTime: a.checkInAt, endTime: now, breakMinutes: 0, hoursWorked: hours, status: 'SUBMITTED', submittedAt: now },
  });
  res.json({ ok: true, hoursWorked: hours, timesheetId: timesheet.id });
}

module.exports = { me, uploadPhoto, respond, listTimesheets, submitTimesheet, clockIn, clockOut };
