// compliance.service.js
// Determines whether a staff member is compliant (documents present, verified,
// and unexpired) and surfaces upcoming expiries. Used by scheduling + AI services.

const { prisma } = require('../config/db');

// Documents every placeable staff member must hold, verified and current.
const REQUIRED_DOCS = ['ID_DOCUMENT', 'SANC_REGISTRATION', 'POLICE_CLEARANCE'];

/**
 * Check a staff member's compliance.
 * @param {string} staffId
 * @param {object} [opts]
 * @param {Date}   [opts.asOf=now]        evaluate compliance at this date
 * @param {number} [opts.warnWithinDays=30] flag docs expiring within N days
 * @returns {Promise<{compliant:boolean, issues:string[], expiring:Array}>}
 */
async function checkCompliance(staffId, opts = {}) {
  const asOf = opts.asOf ? new Date(opts.asOf) : new Date();
  const warnWithinDays = opts.warnWithinDays ?? 30;
  const warnBefore = new Date(asOf.getTime() + warnWithinDays * 86_400_000);

  const docs = await prisma.staffDocument.findMany({ where: { staffId } });

  const issues = [];
  const expiring = [];

  for (const type of REQUIRED_DOCS) {
    const relevant = docs.filter((d) => d.type === type);
    if (relevant.length === 0) {
      issues.push(`Missing required document: ${type}`);
      continue;
    }
    const verified = relevant.filter((d) => d.status === 'VERIFIED');
    if (verified.length === 0) {
      issues.push(`Document not verified: ${type}`);
      continue;
    }
    // If any verified copy is currently valid, we're good for this type.
    const validNow = verified.filter(
      (d) => !d.expiresAt || new Date(d.expiresAt) > asOf,
    );
    if (validNow.length === 0) {
      issues.push(`Document expired: ${type}`);
    }
  }

  // Collect any verified doc expiring soon (across all types, not just required).
  for (const d of docs) {
    if (
      d.status === 'VERIFIED' &&
      d.expiresAt &&
      new Date(d.expiresAt) > asOf &&
      new Date(d.expiresAt) <= warnBefore
    ) {
      const days = Math.ceil((new Date(d.expiresAt) - asOf) / 86_400_000);
      expiring.push({ documentId: d.id, type: d.type, expiresAt: d.expiresAt, daysLeft: days });
    }
  }

  return { compliant: issues.length === 0, issues, expiring };
}

module.exports = { checkCompliance, REQUIRED_DOCS };
