// Admin directory: staff list with a compliance summary (for pickers + tables).
const { prisma } = require('../config/db');
const { checkCompliance } = require('../services/compliance.service');

async function staff(_req, res) {
  const list = await prisma.staff.findMany({ orderBy: { firstName: 'asc' } });
  const out = [];
  for (const s of list) {
    const { compliant, issues, expiring } = await checkCompliance(s.id, { warnWithinDays: 30 });
    const nextExpiry = expiring.sort((a, b) => a.daysLeft - b.daysLeft)[0] || null;
    out.push({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      jobTitle: s.jobTitle,
      status: s.status,
      rating: s.rating,
      city: s.city,
      compliant,
      issues: issues.length,
      expiringSoon: expiring.length,
      nextExpiry,
    });
  }
  res.json({ staff: out });
}

module.exports = { staff };
