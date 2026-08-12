// Team controller (ADMIN only): add employees, add coordinators/admins,
// convert hired applicants into employees, and list the whole team.
const crypto = require('crypto');
const { prisma } = require('../config/db');
const { hashPassword } = require('../utils/auth');
const { ApiError } = require('../utils/http');
const { saveDataUrl } = require('../utils/media');

const VALID_SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const VALID_EMPLOYMENT = ['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACT'];
const VALID_STATUS = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];

/** A friendly one-time password the admin can hand to the new person. */
function tempPassword() {
  return `HGC-${crypto.randomBytes(4).toString('hex')}`;
}

function normEmail(e) {
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw ApiError.badRequest('A valid email is required');
  return e.trim().toLowerCase();
}

/** GET /api/team — everyone with a login: employees + admins. */
async function list(req, res) {
  const staff = await prisma.staff.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, isActive: true, lastLoginAt: true } },
      skills: { select: { name: true, level: true } },
      _count: { select: { assignments: true } },
    },
  });
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  res.json({ staff, admins });
}

/** POST /api/team/staff — create an employee (carer/nurse) plus their login. */
async function createStaff(req, res) {
  const b = req.body || {};
  const email = normEmail(b.email);
  if (!b.firstName || !b.lastName) throw ApiError.badRequest('First and last name are required');
  if (await prisma.user.findUnique({ where: { email } })) throw ApiError.conflict('That email already has an account');

  const employmentType = VALID_EMPLOYMENT.includes(b.employmentType) ? b.employmentType : 'CASUAL';
  const status = VALID_STATUS.includes(b.status) ? b.status : 'ACTIVE';
  const pwd = b.password && b.password.length >= 6 ? b.password : tempPassword();
  const photoUrl = saveDataUrl(b.photo, `staff-${email.split('@')[0]}`, 'profiles');

  const skills = Array.isArray(b.skills)
    ? b.skills
        .filter((s) => s && s.name)
        .map((s) => ({ name: String(s.name).trim(), level: VALID_SKILL_LEVELS.includes(s.level) ? s.level : 'INTERMEDIATE' }))
    : [];

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(pwd),
      role: 'STAFF',
      staff: {
        create: {
          firstName: b.firstName.trim(),
          lastName: b.lastName.trim(),
          phone: b.phone || null,
          jobTitle: b.jobTitle || null,
          city: b.city || null,
          province: b.province || null,
          employmentType,
          status,
          hourlyRate: b.hourlyRate != null && b.hourlyRate !== '' ? Number(b.hourlyRate) : null,
          photoUrl,
          hiredAt: new Date(),
          ...(skills.length && { skills: { create: skills } }),
        },
      },
    },
    include: { staff: true },
  });

  res.status(201).json({
    staff: user.staff,
    login: { email, password: pwd, note: 'Share these once — ask them to change the password after first sign-in.' },
  });
}

/** POST /api/team/admins — create another admin / scheduling coordinator. */
async function createAdmin(req, res) {
  const email = normEmail((req.body || {}).email);
  if (await prisma.user.findUnique({ where: { email } })) throw ApiError.conflict('That email already has an account');
  const pwd = req.body.password && req.body.password.length >= 6 ? req.body.password : tempPassword();

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(pwd), role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  });
  res.status(201).json({ admin: user, login: { email, password: pwd, note: 'Share these once — ask them to change the password after first sign-in.' } });
}

/** POST /api/team/applications/:id/convert — turn a hired applicant into an employee. */
async function convertApplicant(req, res) {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) throw ApiError.notFound('Application not found');
  if (app.hiredStaffId) throw ApiError.badRequest('This applicant is already an employee');

  const email = normEmail(app.email);
  if (await prisma.user.findUnique({ where: { email } })) throw ApiError.conflict('An account already exists for this email');

  const pwd = tempPassword();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(pwd),
      role: 'STAFF',
      staff: {
        create: {
          firstName: app.firstName,
          lastName: app.lastName,
          phone: app.phone || null,
          status: 'ACTIVE',
          hiredAt: new Date(),
        },
      },
    },
    include: { staff: true },
  });

  await prisma.application.update({
    where: { id: app.id },
    data: { status: 'HIRED', hiredStaffId: user.staff.id },
  });

  res.status(201).json({
    staff: user.staff,
    login: { email, password: pwd, note: 'Share these once — ask them to change the password after first sign-in.' },
  });
}

module.exports = { list, createStaff, createAdmin, convertApplicant };
