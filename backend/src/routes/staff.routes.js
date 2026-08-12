const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/staff.controller');

router.use(authenticate, authorize('STAFF'));

router.get('/me', asyncHandler(c.me));
router.post('/me/photo', asyncHandler(c.uploadPhoto));
router.get('/me/timesheets', asyncHandler(c.listTimesheets));
router.post('/timesheets', asyncHandler(c.submitTimesheet));
router.post('/assignments/:id/respond', asyncHandler(c.respond));
router.post('/assignments/:id/clock-in', asyncHandler(c.clockIn));
router.post('/assignments/:id/clock-out', asyncHandler(c.clockOut));

module.exports = router;
