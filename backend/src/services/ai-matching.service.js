// ai-matching.service.js
// AI layer for Hazel Glen Care. Works on its own with transparent heuristics,
// and exposes a single `llm` hook you can wire to your provider of choice to
// refine results. Nothing here calls an external API by default.
//
//   generateStaffMatchScore(staffId, shiftId) -> persisted STAFF_MATCH recommendation
//   screenApplicantCV(applicationId)          -> screening score + summary + flags
//   detectComplianceExpiry(withinDays)        -> COMPLIANCE_ALERT recs + notifications
//   generateAIReport(type, period)            -> aggregated Report with a summary

const { prisma } = require('../config/db');
const { scoreStaffMatch } = require('./scheduling.service');
const { checkCompliance } = require('./compliance.service');
const { billableHours } = require('../utils/time');

/**
 * Optional LLM hook. Replace the body with a real call (Claude, etc.).
 * Must resolve to a string. By default it echoes the deterministic summary.
 */
async function llm(_prompt, fallback = '') {
  if (typeof globalThis.__hazelLLM === 'function') {
    try {
      return await globalThis.__hazelLLM(_prompt);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Score one staff member against one shift and persist an AIRecommendation.
 */
async function generateStaffMatchScore(staffId, shiftId) {
  const [staff, shift] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: staffId },
      include: { skills: true, availability: true, assignments: { include: { shift: true } } },
    }),
    prisma.shift.findUnique({ where: { id: shiftId } }),
  ]);
  if (!staff || !shift) throw new Error('Staff or shift not found');

  const { compliant } = await checkCompliance(staffId);
  const result = scoreStaffMatch(staff, shift, { compliant });

  const rationale =
    `Fit ${result.score}/100 — ` +
    Object.entries(result.breakdown)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ') +
    (result.reasons.length ? ` | notes: ${result.reasons.join('; ')}` : '');

  const rec = await prisma.aIRecommendation.create({
    data: {
      type: 'STAFF_MATCH',
      status: 'NEW',
      score: result.score,
      rationale,
      payload: result.breakdown,
      staffId,
      shiftId,
    },
  });
  return { recommendation: rec, ...result };
}

// Simple keyword taxonomy for CV screening. Extend per role.
const CV_SIGNALS = {
  qualification: ['registered nurse', 'enrolled nurse', 'sanc', 'diploma', 'degree', 'nqf', 'first aid', 'cpr'],
  experience: ['years', 'experience', 'frail care', 'home care', 'hospital', 'clinic', 'geriatric'],
  specialism: ['dementia', 'alzheimer', 'palliative', 'wound care', 'chronic', 'rehabilitation'],
  softSkills: ['compassion', 'patience', 'reliable', 'punctual', 'communication', 'caring'],
};
const RED_FLAGS = ['gap in employment', 'terminated', 'no references'];

/**
 * Screen an applicant's CV text with transparent keyword scoring, then
 * optionally refine the summary with the LLM hook. Persists the score on
 * the Application and returns the assessment.
 * @param {string} applicationId
 * @param {string} [cvText] raw CV text; falls back to application.coverLetter
 */
async function screenApplicantCV(applicationId, cvText) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { jobPost: true },
  });
  if (!application) throw new Error('Application not found');

  const text = (cvText || application.coverLetter || '').toLowerCase();

  const hits = {};
  let raw = 0;
  const weights = { qualification: 40, experience: 25, specialism: 20, softSkills: 15 };
  for (const [group, terms] of Object.entries(CV_SIGNALS)) {
    const found = terms.filter((t) => text.includes(t));
    hits[group] = found;
    const coverage = found.length / terms.length;
    raw += coverage * weights[group];
  }
  const flags = RED_FLAGS.filter((f) => text.includes(f));
  const score = Math.max(0, Math.min(100, Math.round(raw - flags.length * 8)));

  const recommendation =
    score >= 70 ? 'SHORTLIST' : score >= 45 ? 'REVIEW' : 'HOLD';

  const baseSummary =
    `Screening score ${score}/100 (${recommendation}). ` +
    `Qualifications: ${hits.qualification.join(', ') || 'none detected'}. ` +
    `Specialisms: ${hits.specialism.join(', ') || 'none detected'}.` +
    (flags.length ? ` Flags: ${flags.join(', ')}.` : '');

  const summary = await llm(
    `Summarise this care-worker CV screening for a recruiter in 2 sentences. ` +
      `Job: ${application.jobPost?.title || 'general care'}. Signals: ${JSON.stringify(hits)}. Flags: ${flags}.`,
    baseSummary,
  );

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      aiScore: score,
      aiSummary: summary,
      status: score >= 70 ? 'SHORTLISTED' : application.status,
    },
  });

  await prisma.aIRecommendation.create({
    data: {
      type: 'APPLICANT_SCREENING',
      status: 'NEW',
      score,
      rationale: summary,
      payload: { hits, flags, recommendation },
      applicationId,
    },
  });

  return { score, recommendation, hits, flags, summary };
}

/**
 * Find documents expiring within `withinDays`, and for each create a
 * COMPLIANCE_ALERT recommendation plus a notification to the staff member.
 * Idempotent-ish: skips docs that already have an open alert.
 * @param {number} [withinDays=30]
 */
async function detectComplianceExpiry(withinDays = 30) {
  const now = new Date();
  const until = new Date(now.getTime() + withinDays * 86_400_000);

  const expiring = await prisma.staffDocument.findMany({
    where: {
      status: 'VERIFIED',
      expiresAt: { gt: now, lte: until },
    },
    include: { staff: true },
  });

  const created = [];
  for (const doc of expiring) {
    const existing = await prisma.aIRecommendation.findFirst({
      where: {
        type: 'COMPLIANCE_ALERT',
        staffId: doc.staffId,
        status: { in: ['NEW', 'REVIEWED'] },
        payload: { path: ['documentId'], equals: doc.id },
      },
    });
    if (existing) continue;

    const daysLeft = Math.ceil((new Date(doc.expiresAt) - now) / 86_400_000);
    const rationale = `${doc.type} for ${doc.staff.firstName} ${doc.staff.lastName} expires in ${daysLeft} day(s).`;

    const rec = await prisma.aIRecommendation.create({
      data: {
        type: 'COMPLIANCE_ALERT',
        status: 'NEW',
        rationale,
        payload: { documentId: doc.id, type: doc.type, daysLeft },
        staffId: doc.staffId,
      },
    });
    await prisma.notification.create({
      data: {
        userId: doc.staff.userId,
        channel: 'EMAIL',
        title: 'Document expiring soon',
        body: `Your ${doc.type} expires in ${daysLeft} day(s). Please upload a renewal to stay eligible for shifts.`,
        data: { documentId: doc.id },
      },
    });
    created.push(rec);
  }
  return { scanned: expiring.length, alertsCreated: created.length, alerts: created };
}

/**
 * Aggregate platform data into a Report with a human-readable summary.
 * @param {'SHIFTS'|'FINANCE'|'COMPLIANCE'|'RECRUITMENT'|'STAFF'} type
 * @param {{start:Date, end:Date}} period
 * @param {string} [generatedById]
 */
async function generateAIReport(type, period, generatedById) {
  const start = new Date(period.start);
  const end = new Date(period.end);
  const range = { gte: start, lte: end };
  let metrics = {};
  let summary = '';

  if (type === 'SHIFTS') {
    const [total, filled, cancelled, assignments] = await Promise.all([
      prisma.shift.count({ where: { startAt: range } }),
      prisma.shift.count({ where: { startAt: range, status: { in: ['FILLED', 'COMPLETED'] } } }),
      prisma.shift.count({ where: { startAt: range, status: 'CANCELLED' } }),
      prisma.shiftAssignment.count({ where: { status: 'NO_SHOW', shift: { startAt: range } } }),
    ]);
    const fillRate = total ? Math.round((filled / total) * 100) : 0;
    metrics = { total, filled, cancelled, noShows: assignments, fillRate };
    summary = `${total} shifts scheduled, ${fillRate}% fill rate, ${assignments} no-shows, ${cancelled} cancelled.`;
  } else if (type === 'FINANCE') {
    const invoices = await prisma.invoice.findMany({ where: { issueDate: range } });
    const sum = (k) => invoices.reduce((a, i) => a + Number(i[k]), 0);
    const billed = sum('total');
    const paid = sum('amountPaid');
    const outstanding = billed - paid;
    metrics = { invoices: invoices.length, billed, paid, outstanding };
    summary = `R${billed.toFixed(2)} billed across ${invoices.length} invoices; R${paid.toFixed(2)} collected, R${outstanding.toFixed(2)} outstanding.`;
  } else if (type === 'COMPLIANCE') {
    const { alertsCreated, scanned } = await detectComplianceExpiry(30);
    const expired = await prisma.staffDocument.count({
      where: { status: 'VERIFIED', expiresAt: { lt: new Date() } },
    });
    metrics = { expiringSoon: scanned, alertsCreated, expired };
    summary = `${scanned} document(s) expiring within 30 days, ${expired} already expired. ${alertsCreated} new alert(s) raised.`;
  } else if (type === 'RECRUITMENT') {
    const [received, shortlisted, hired] = await Promise.all([
      prisma.application.count({ where: { createdAt: range } }),
      prisma.application.count({ where: { createdAt: range, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { createdAt: range, status: 'HIRED' } }),
    ]);
    metrics = { received, shortlisted, hired };
    summary = `${received} applications received, ${shortlisted} shortlisted, ${hired} hired.`;
  } else if (type === 'STAFF') {
    const [active, pending] = await Promise.all([
      prisma.staff.count({ where: { status: 'ACTIVE' } }),
      prisma.staff.count({ where: { status: 'PENDING' } }),
    ]);
    metrics = { active, pending };
    summary = `${active} active staff, ${pending} in onboarding.`;
  } else {
    throw new Error(`Unknown report type: ${type}`);
  }

  const narrative = await llm(
    `Write a 2-sentence executive summary for a ${type} report. Metrics: ${JSON.stringify(metrics)}.`,
    summary,
  );

  const report = await prisma.report.create({
    data: {
      type,
      title: `${type[0]}${type.slice(1).toLowerCase()} report`,
      params: { period: { start, end } },
      summary: narrative,
      periodStart: start,
      periodEnd: end,
      generatedById: generatedById || null,
    },
  });
  return { report, metrics, summary: narrative };
}

module.exports = {
  generateStaffMatchScore,
  screenApplicantCV,
  detectComplianceExpiry,
  generateAIReport,
  llm,
};
