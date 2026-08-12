// Shifts controller: CRUD + scheduling-engine actions.
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');
const {
  findAvailableStaff,
  autoAssignStaff,
  broadcastEmergencyShift,
} = require('../services/scheduling.service');

/** GET /api/shifts?status=&from=&to=&clientId= */
async function list(req, res) {
  const { status, from, to, clientId, careType } = req.query;
  const where = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (careType) where.careType = careType;
  if (from || to) where.startAt = { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) };

  const shifts = await prisma.shift.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: { client: true, assignments: { include: { staff: true } } },
  });
  res.json({ shifts });
}

/** GET /api/shifts/:id */
async function getOne(req, res) {
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: { client: true, assignments: { include: { staff: true } }, shiftRequest: true },
  });
  if (!shift) throw ApiError.notFound('Shift not found');
  res.json({ shift });
}

/** POST /api/shifts */
async function create(req, res) {
  const { clientId, title, careType, startAt, endAt } = req.body;
  if (!clientId || !title || !careType || !startAt || !endAt) {
    throw ApiError.badRequest('clientId, title, careType, startAt and endAt are required');
  }
  const shift = await prisma.shift.create({
    data: {
      ...req.body,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: req.body.status || 'OPEN',
      createdById: req.user?.id,
    },
  });
  res.status(201).json({ shift });
}

/** PATCH /api/shifts/:id */
async function update(req, res) {
  const data = { ...req.body };
  if (data.startAt) data.startAt = new Date(data.startAt);
  if (data.endAt) data.endAt = new Date(data.endAt);
  const shift = await prisma.shift.update({ where: { id: req.params.id }, data });
  res.json({ shift });
}

/** DELETE /api/shifts/:id  (soft-cancel) */
async function cancel(req, res) {
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });
  res.json({ shift });
}

/** GET /api/shifts/:id/candidates — ranked eligible staff */
async function candidates(req, res) {
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!shift) throw ApiError.notFound('Shift not found');
  const ranked = await findAvailableStaff(shift, { limit: Number(req.query.limit) || 25 });
  res.json({
    candidates: ranked.map((c) => ({
      staffId: c.staffId,
      name: `${c.staff.firstName} ${c.staff.lastName}`.trim(),
      score: c.score,
      breakdown: c.breakdown,
      distanceKm: c.distanceKm,
    })),
  });
}

/** POST /api/shifts/:id/auto-assign  { autoConfirm? } */
async function autoAssign(req, res) {
  const result = await autoAssignStaff(req.params.id, { autoConfirm: !!req.body.autoConfirm });
  res.json(result);
}

/** POST /api/shifts/:id/broadcast — emergency broadcast */
async function broadcast(req, res) {
  const result = await broadcastEmergencyShift(req.params.id);
  res.json(result);
}

module.exports = { list, getOne, create, update, cancel, candidates, autoAssign, broadcast };
