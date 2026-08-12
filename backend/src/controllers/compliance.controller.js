// Compliance controller: per-staff check + platform-wide expiry scan + admin reminders.
const { prisma } = require('../config/db');
const { checkCompliance } = require('../services/compliance.service');
const { detectComplianceExpiry } = require('../services/ai-matching.service');
const DAY = 86_400_000;

/** GET /api/compliance/staff/:staffId */
async function checkStaff(req, res) {
  const result = await checkCompliance(req.params.staffId, {
    warnWithinDays: Number(req.query.warnWithinDays) || 30,
  });
  res.json(result);
}

/** POST /api/compliance/scan  { withinDays? } — raise alerts for expiring docs */
async function scan(req, res) {
  const result = await detectComplianceExpiry(Number(req.body.withinDays) || 30);
  res.json(result);
}

/**
 * POST /api/compliance/remind  { withinDays? }
 * Raises in-app reminders to every admin for documents expiring soon or already
 * expired, de-duplicated against unread reminders for the same document.
 */
async function remind(req, res) {
  const withinDays = Number(req.body.withinDays) || 30;
  const now = new Date();
  const until = new Date(now.getTime() + withinDays * DAY);

  const docs = await prisma.staffDocument.findMany({
    where: { OR: [{ status: 'VERIFIED', expiresAt: { lte: until } }, { status: 'EXPIRED' }] },
    include: { staff: true },
  });
  const relevant = docs.filter((d) => d.status === 'EXPIRED' || (d.expiresAt && d.expiresAt <= until));
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });

  let created = 0;
  for (const d of relevant) {
    const expired = d.status === 'EXPIRED' || (d.expiresAt && d.expiresAt < now);
    const daysLeft = d.expiresAt ? Math.ceil((new Date(d.expiresAt) - now) / DAY) : null;
    const title = expired ? 'Compliance expired' : 'Compliance expiring soon';
    const body = `${d.staff.firstName} ${d.staff.lastName} — ${String(d.type).replace(/_/g, ' ')} ${expired ? 'has expired' : `expires in ${daysLeft} day(s)`}.`;
    for (const admin of admins) {
      const existing = await prisma.notification.findFirst({
        where: { userId: admin.id, isRead: false, data: { path: ['documentId'], equals: d.id } },
      });
      if (existing) continue;
      await prisma.notification.create({
        data: { userId: admin.id, channel: 'IN_APP', title, body, data: { documentId: d.id, staffId: d.staffId } },
      });
      created++;
    }
  }
  res.json({ flagged: relevant.length, notificationsCreated: created });
}

module.exports = { checkStaff, scan, remind };
