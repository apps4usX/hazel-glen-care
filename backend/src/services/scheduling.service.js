// scheduling.service.js
// The scheduling engine for Hazel Glen Care.
//
//   findAvailableStaff(shift)      -> eligible, scored, ranked candidates
//   checkCompliance(staffId)       -> re-exported from compliance.service
//   scoreStaffMatch(staff, shift)  -> weighted 0-100 fit score + breakdown
//   autoAssignStaff(shiftId)       -> assign the best N candidates to a shift
//   broadcastEmergencyShift(id)    -> notify a wider pool for urgent cover
//
// Scoring is deterministic and explainable. The AI layer (ai-matching.service)
// can refine these scores, but the engine works fully on its own.

const { prisma } = require('../config/db');
const { distanceKm } = require('../utils/geo');
const { availabilityCoversShift, overlaps, billableHours } = require('../utils/time');
const { checkCompliance } = require('./compliance.service');

// Relative weights for the match score (sum = 100).
const WEIGHTS = {
  skill: 30,
  proximity: 20,
  availability: 15,
  compliance: 15,
  performance: 15,
  employment: 5,
};

const MAX_DISTANCE_KM = 60; // beyond this, proximity score is 0

/**
 * Score how well a staff member fits a shift. Returns a 0-100 score with a
 * per-factor breakdown and an `eligible` flag (hard requirements).
 * Expects `staff` to include: skills, documents, assignments (for conflicts).
 */
function scoreStaffMatch(staff, shift, precomputed = {}) {
  const breakdown = {};
  const reasons = [];
  let eligible = true;

  // --- hard requirement: active ---
  if (staff.status !== 'ACTIVE') {
    eligible = false;
    reasons.push('not active');
  }

  // --- skill (soft-weighted, but a required skill that is missing is a hard fail) ---
  let skillScore = 1;
  if (shift.requiredSkill) {
    const match = (staff.skills || []).find(
      (s) => s.name.toLowerCase() === shift.requiredSkill.toLowerCase(),
    );
    if (!match) {
      eligible = false;
      skillScore = 0;
      reasons.push(`missing required skill: ${shift.requiredSkill}`);
    } else {
      const levelRank = { BEGINNER: 0.4, INTERMEDIATE: 0.7, ADVANCED: 0.9, EXPERT: 1 };
      skillScore = levelRank[match.level] ?? 0.7;
    }
  }
  breakdown.skill = Math.round(skillScore * WEIGHTS.skill);

  // --- proximity ---
  let proxScore = 0.5; // neutral when we can't compute distance
  const dist = precomputed.distanceKm ?? distanceKm(staff, shift);
  if (dist != null) {
    proxScore = Math.max(0, 1 - dist / MAX_DISTANCE_KM);
  }
  breakdown.proximity = Math.round(proxScore * WEIGHTS.proximity);

  // --- availability ---
  const isAvailable =
    precomputed.isAvailable ??
    (staff.availability || []).some((a) =>
      availabilityCoversShift(a, shift.startAt, shift.endAt),
    );
  if (staff.availability && !isAvailable) {
    // availability data exists but none covers the shift -> hard fail
    eligible = false;
    reasons.push('no matching availability');
  }
  breakdown.availability = isAvailable ? WEIGHTS.availability : 0;

  // --- no double-booking (hard) ---
  const conflict = (staff.assignments || []).some(
    (asg) =>
      asg.shift &&
      ['OFFERED', 'ACCEPTED', 'CONFIRMED', 'CHECKED_IN'].includes(asg.status) &&
      overlaps(asg.shift.startAt, asg.shift.endAt, shift.startAt, shift.endAt),
  );
  if (conflict) {
    eligible = false;
    reasons.push('already booked in this time window');
  }

  // --- compliance ---
  const compliant = precomputed.compliant ?? true;
  if (!compliant) {
    eligible = false;
    reasons.push('not compliant');
  }
  breakdown.compliance = compliant ? WEIGHTS.compliance : 0;

  // --- past performance (rolling rating, 0-5) ---
  const rating = staff.rating ?? 3.5; // neutral default for new staff
  breakdown.performance = Math.round((rating / 5) * WEIGHTS.performance);

  // --- employment fit (prefer casual/part-time for ad-hoc cover) ---
  const empFit = staff.employmentType === 'CASUAL' || staff.employmentType === 'PART_TIME' ? 1 : 0.6;
  breakdown.employment = Math.round(empFit * WEIGHTS.employment);

  const score = eligible
    ? Object.values(breakdown).reduce((a, b) => a + b, 0)
    : 0;

  return { staffId: staff.id, score, eligible, breakdown, reasons, distanceKm: dist };
}

/**
 * Find eligible staff for a shift, scored and ranked (best first).
 * @param {object} shift  a Shift record (or shiftId is resolved by the caller)
 * @param {object} [opts]
 * @param {number} [opts.limit=25]
 * @param {boolean}[opts.includeIneligible=false]
 */
async function findAvailableStaff(shift, opts = {}) {
  const limit = opts.limit ?? 25;

  // Candidate pool: active staff, with the data we need to score them.
  const candidates = await prisma.staff.findMany({
    where: { status: 'ACTIVE' },
    include: {
      skills: true,
      availability: true,
      assignments: { include: { shift: true } },
    },
  });

  const scored = [];
  for (const staff of candidates) {
    const { compliant } = await checkCompliance(staff.id);
    const result = scoreStaffMatch(staff, shift, { compliant });
    if (result.eligible || opts.includeIneligible) {
      scored.push({ ...result, staff });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Automatically assign the best-matching staff to a shift, up to headcount.
 * Creates ShiftAssignment rows (status OFFERED) and updates the shift status.
 * @returns {Promise<{shiftId:string, assigned:Array, status:string}>}
 */
async function autoAssignStaff(shiftId, opts = {}) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error(`Shift ${shiftId} not found`);

  const need = shift.headcount ?? 1;
  const ranked = await findAvailableStaff(shift, { limit: need * 3 });
  const chosen = ranked.slice(0, need);

  const assigned = [];
  for (const c of chosen) {
    const assignment = await prisma.shiftAssignment.upsert({
      where: { shiftId_staffId: { shiftId, staffId: c.staffId } },
      update: { status: 'OFFERED', matchScore: c.score, offeredAt: new Date() },
      create: {
        shiftId,
        staffId: c.staffId,
        status: opts.autoConfirm ? 'CONFIRMED' : 'OFFERED',
        matchScore: c.score,
        offeredAt: new Date(),
        confirmedAt: opts.autoConfirm ? new Date() : null,
      },
    });
    assigned.push({ ...assignment, matchScore: c.score });

    await prisma.notification.create({
      data: {
        userId: c.staff.userId,
        channel: 'IN_APP',
        title: 'New shift offer',
        body: `You've been offered "${shift.title}" on ${new Date(shift.startAt).toLocaleString()}.`,
        data: { shiftId, assignmentId: assignment.id },
      },
    });
  }

  const status =
    assigned.length >= need ? 'FILLED' : assigned.length > 0 ? 'PARTIALLY_FILLED' : 'OPEN';
  await prisma.shift.update({ where: { id: shiftId }, data: { status } });

  return { shiftId, assigned, status };
}

/**
 * Broadcast an urgent shift to a wide eligible pool (relaxed proximity),
 * notifying everyone so the first to accept can take it.
 * @returns {Promise<{shiftId:string, notified:number}>}
 */
async function broadcastEmergencyShift(shiftId) {
  const shift = await prisma.shift.update({
    where: { id: shiftId },
    data: { isEmergency: true, status: 'OPEN' },
  });

  // Relaxed pool: eligible on the hard requirements, distance ignored for reach.
  const ranked = await findAvailableStaff(shift, { limit: 200 });

  let notified = 0;
  for (const c of ranked) {
    await prisma.notification.create({
      data: {
        userId: c.staff.userId,
        channel: 'PUSH',
        title: '🚨 Urgent shift available',
        body: `Urgent cover needed: "${shift.title}" on ${new Date(shift.startAt).toLocaleString()}. First to accept secures it.`,
        data: { shiftId, emergency: true },
      },
    });
    notified += 1;
  }
  return { shiftId, notified };
}

module.exports = {
  scoreStaffMatch,
  findAvailableStaff,
  autoAssignStaff,
  broadcastEmergencyShift,
  checkCompliance, // re-exported for convenience
  billableHours,
  WEIGHTS,
};
