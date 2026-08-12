// Reports controller: generate + list.
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');
const { generateAIReport } = require('../services/ai-matching.service');

const VALID = ['SHIFTS', 'FINANCE', 'COMPLIANCE', 'RECRUITMENT', 'STAFF', 'CUSTOM'];

/** POST /api/reports  { type, start, end } */
async function generate(req, res) {
  const { type, start, end } = req.body;
  if (!VALID.includes(type)) throw ApiError.badRequest(`type must be one of ${VALID.join(', ')}`);
  if (!start || !end) throw ApiError.badRequest('start and end are required');
  const result = await generateAIReport(type, { start, end }, req.user?.id);
  res.status(201).json(result);
}

/** GET /api/reports?type= */
async function list(req, res) {
  const where = req.query.type ? { type: req.query.type } : {};
  const reports = await prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ reports });
}

module.exports = { generate, list };
