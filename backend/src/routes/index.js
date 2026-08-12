// Mounts all API route modules under /api.
const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'hazel-glen-care-api' }));

router.use('/auth', require('./auth.routes'));
router.use('/shifts', require('./shifts.routes'));
router.use('/recruitment', require('./recruitment.routes'));
router.use('/compliance', require('./compliance.routes'));
router.use('/reports', require('./reports.routes'));
 router.use('/staff', require('./staff.routes'));
 router.use('/client', require('./client.routes'));
 router.use('/notifications', require('./notifications.routes'));
 router.use('/invoices', require('./invoices.routes'));
 router.use('/clients', require('./clients.routes'));
 router.use('/directory', require('./directory.routes'));
 router.use('/timesheets', require('./timesheets.routes'));
 router.use('/team', require('./team.routes'));
 router.use('/metrics', require('./metrics.routes'));

module.exports = router;
