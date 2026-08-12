// Client portal controller: own bookings, invoices, and care requests.
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');

async function requirePortalUser(userId) {
  const cpu = await prisma.clientPortalUser.findUnique({ where: { userId }, include: { client: true } });
  if (!cpu) throw ApiError.notFound('Client profile not found');
  return cpu;
}

/** GET /api/client/me — client + shifts + invoices + requests */
async function me(req, res) {
  const cpu = await requirePortalUser(req.user.id);
  const [shifts, invoices, requests] = await Promise.all([
    prisma.shift.findMany({
      where: { clientId: cpu.clientId },
      orderBy: { startAt: 'desc' },
      include: { assignments: { include: { staff: true } } },
    }),
    prisma.invoice.findMany({ where: { clientId: cpu.clientId }, orderBy: { issueDate: 'desc' }, include: { items: true } }),
    prisma.shiftRequest.findMany({ where: { clientId: cpu.clientId }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({
    client: cpu.client,
    portalUser: { id: cpu.id, firstName: cpu.firstName, lastName: cpu.lastName },
    shifts, invoices, requests,
  });
}

/** POST /api/client/shift-requests  { careType, startAt, endAt, headcount?, requiredSkill?, title?, notes? } */
async function createRequest(req, res) {
  const cpu = await requirePortalUser(req.user.id);
  const { careType, startAt, endAt, headcount = 1, requiredSkill, title, notes } = req.body;
  if (!careType || !startAt || !endAt) throw ApiError.badRequest('careType, startAt and endAt are required');

  const request = await prisma.shiftRequest.create({
    data: {
      clientId: cpu.clientId,
      requestedById: cpu.id,
      careType, title, requiredSkill, notes,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      headcount: Number(headcount) || 1,
      status: 'PENDING',
    },
  });

  // Notify admins that a new request has come in.
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id, channel: 'IN_APP', title: 'New care request',
      body: `${cpu.client.name} requested ${careType.replaceAll('_', ' ').toLowerCase()} cover.`,
      data: { shiftRequestId: request.id },
    })),
  });

  res.status(201).json({ request });
}

/** GET /api/client/shift-requests */
async function listRequests(req, res) {
  const cpu = await requirePortalUser(req.user.id);
  const requests = await prisma.shiftRequest.findMany({ where: { clientId: cpu.clientId }, orderBy: { createdAt: 'desc' } });
  res.json({ requests });
}

module.exports = { me, createRequest, listRequests };
