// Admin timesheets / attendance: list with clock-in verification, approve/reject/pay.
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');

async function list(req, res) {
  const where = req.query.status ? { status: req.query.status } : {};
  const timesheets = await prisma.staffTimesheet.findMany({
    where, orderBy: { workDate: 'desc' }, take: 200,
    include: {
      staff: { select: { firstName: true, lastName: true } },
      shiftAssignment: { include: { shift: { select: { title: true, client: { select: { name: true } } } } } },
    },
  });
  res.json({ timesheets });
}

async function setStatus(req, res) {
  const valid = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'];
  if (!valid.includes(req.body.status)) throw ApiError.badRequest(`status must be one of ${valid.join(', ')}`);
  const data = { status: req.body.status };
  if (req.body.status === 'APPROVED') { data.approvedById = req.user.id; data.approvedAt = new Date(); }
  const timesheet = await prisma.staffTimesheet.update({ where: { id: req.params.id }, data });
  res.json({ timesheet });
}

module.exports = { list, setStatus };
