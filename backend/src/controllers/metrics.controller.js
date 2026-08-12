// Dashboard metrics: aggregates real figures for the admin performance charts.
const { prisma } = require('../config/db');

const num = (d) => (d == null ? 0 : Number(d));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
function weekLabel(d) { return `${d.getDate()}/${d.getMonth() + 1}`; }

/** Build N week buckets ending on the current week. */
function weekBuckets(n) {
  const start = startOfWeek(new Date());
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = new Date(start); ws.setDate(ws.getDate() - i * 7);
    buckets.push({ start: ws, end: new Date(ws.getTime() + 7 * 864e5), label: weekLabel(ws) });
  }
  return buckets;
}
function monthBuckets(n) {
  const now = new Date();
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ y: m.getFullYear(), m: m.getMonth(), label: MONTHS[m.getMonth()] });
  }
  return buckets;
}

async function dashboard(req, res) {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 864e5);

  const [shifts, timesheets, applications, documents, invoices, staff, assignments] = await Promise.all([
    prisma.shift.findMany({ select: { status: true, startAt: true, chargeRate: true, headcount: true } }),
    prisma.staffTimesheet.findMany({ select: { status: true, workDate: true, hoursWorked: true } }),
    prisma.application.findMany({ select: { status: true } }),
    prisma.staffDocument.findMany({ select: { status: true, expiresAt: true } }),
    prisma.invoice.findMany({ select: { status: true, total: true, amountPaid: true, issueDate: true } }),
    prisma.staff.findMany({ select: { status: true } }),
    prisma.shiftAssignment.findMany({ select: { status: true, checkInPhoto: true, checkInAt: true } }),
  ]);

  // ---- Shifts: status split + weekly filled vs open ----
  const shiftStatus = {};
  shifts.forEach((s) => { shiftStatus[s.status] = (shiftStatus[s.status] || 0) + 1; });
  const filledStates = ['FILLED', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_FILLED'];
  const filled = shifts.filter((s) => filledStates.includes(s.status)).length;
  const nonCancelled = shifts.filter((s) => s.status !== 'CANCELLED').length || 1;
  const fillRatePct = Math.round((filled / nonCancelled) * 100);

  const sw = weekBuckets(6);
  const shiftsByWeek = sw.map((b) => {
    const inWk = shifts.filter((s) => s.startAt >= b.start && s.startAt < b.end);
    return {
      label: b.label,
      filled: inWk.filter((s) => filledStates.includes(s.status) || s.status === 'COMPLETED').length,
      open: inWk.filter((s) => s.status === 'OPEN').length,
    };
  });

  // ---- Hours worked per week ----
  const hoursByWeek = sw.map((b) => ({
    label: b.label,
    hours: Math.round(timesheets.filter((t) => t.workDate >= b.start && t.workDate < b.end)
      .reduce((a, t) => a + num(t.hoursWorked), 0)),
  }));

  // ---- Compliance breakdown ----
  const compliance = { compliant: 0, expiringSoon: 0, expired: 0, pending: 0, rejected: 0 };
  documents.forEach((d) => {
    if (d.status === 'REJECTED') compliance.rejected++;
    else if (d.status === 'PENDING') compliance.pending++;
    else if (d.status === 'EXPIRED' || (d.expiresAt && d.expiresAt < now)) compliance.expired++;
    else if (d.expiresAt && d.expiresAt < soon) compliance.expiringSoon++;
    else compliance.compliant++;
  });

  // ---- Recruitment funnel ----
  const stages = ['RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED'];
  const appByStatus = {};
  applications.forEach((a) => { appByStatus[a.status] = (appByStatus[a.status] || 0) + 1; });
  const funnel = stages.map((s) => ({ stage: s, count: appByStatus[s] || 0 }));

  // ---- Finance: revenue by month, paid vs outstanding ----
  const mb = monthBuckets(6);
  const revenueByMonth = mb.map((b) => ({
    label: b.label,
    amount: Math.round(invoices.filter((iv) => iv.issueDate.getFullYear() === b.y && iv.issueDate.getMonth() === b.m)
      .reduce((a, iv) => a + num(iv.total), 0)),
  }));
  const paid = invoices.reduce((a, iv) => a + num(iv.amountPaid), 0);
  const outstanding = invoices.filter((iv) => !['PAID', 'VOID'].includes(iv.status))
    .reduce((a, iv) => a + (num(iv.total) - num(iv.amountPaid)), 0);

  // ---- Timesheets & attendance ----
  const tsByStatus = {};
  timesheets.forEach((t) => { tsByStatus[t.status] = (tsByStatus[t.status] || 0) + 1; });
  const clockedIn = assignments.filter((a) => a.checkInAt).length;
  const withPhoto = assignments.filter((a) => a.checkInPhoto).length;
  const verifiedPct = clockedIn ? Math.round((withPhoto / clockedIn) * 100) : 0;

  res.json({
    shifts: { byStatus: shiftStatus, fillRatePct, filled, total: shifts.length, byWeek: shiftsByWeek },
    hours: { byWeek: hoursByWeek, total: hoursByWeek.reduce((a, w) => a + w.hours, 0) },
    compliance,
    recruitment: { funnel, total: applications.length, hired: appByStatus.HIRED || 0 },
    finance: { revenueByMonth, paid: Math.round(paid), outstanding: Math.round(outstanding) },
    attendance: { byStatus: tsByStatus, clockedIn, verifiedPct },
    staff: { active: staff.filter((s) => s.status === 'ACTIVE').length, total: staff.length },
  });
}

module.exports = { dashboard };
