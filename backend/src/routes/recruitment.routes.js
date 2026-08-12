const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/recruitment.controller');

// Public: browse open jobs and submit an application.
router.get('/jobs', asyncHandler(c.listJobs));
router.get('/jobs/:id', asyncHandler(c.getJob));
router.post('/applications', asyncHandler(c.apply));

// Admin: manage jobs, review + screen applicants.
router.post('/jobs', authenticate, authorize('ADMIN'), asyncHandler(c.createJob));
router.get('/applications', authenticate, authorize('ADMIN'), asyncHandler(c.listApplications));
router.post('/applications/:id/screen', authenticate, authorize('ADMIN'), asyncHandler(c.screen));
router.patch('/applications/:id/status', authenticate, authorize('ADMIN'), asyncHandler(c.setStatus));

module.exports = router;
