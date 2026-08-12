# Hazel Glen Care — Scheduling & AI services

Node.js (CommonJS) services built on the Prisma schema. No external API calls by default.

## Files
- `config/db.js` — Prisma client singleton
- `utils/geo.js` — Haversine distance (km)
- `utils/time.js` — day-of-week, HH:mm parsing, interval overlap, billable hours
- `services/compliance.service.js` — `checkCompliance(staffId)`
- `services/scheduling.service.js` — `findAvailableStaff`, `scoreStaffMatch`, `autoAssignStaff`, `broadcastEmergencyShift`
- `services/ai-matching.service.js` — `generateStaffMatchScore`, `screenApplicantCV`, `detectComplianceExpiry`, `generateAIReport`

## Match score (0-100)
skill 30 · proximity 20 · availability 15 · compliance 15 · performance 15 · employment 5.
Hard requirements (active, required skill, availability, no double-booking, compliant)
gate eligibility before the weighted score is applied — so an ineligible match scores 0.

## LLM hook
`ai-matching.service.js` exposes `llm(prompt, fallback)`. Set `globalThis.__hazelLLM`
to an async function to refine summaries/scores with your provider (e.g. Claude);
otherwise the deterministic fallback text is used.

## Usage
```js
const { autoAssignStaff } = require('./services/scheduling.service');
await autoAssignStaff(shiftId);            // offers the best N staff, notifies them

const { detectComplianceExpiry } = require('./services/ai-matching.service');
await detectComplianceExpiry(30);          // raise alerts for docs expiring in 30 days
```
