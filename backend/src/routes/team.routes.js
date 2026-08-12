const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/team.controller');

router.use(authenticate, authorize('ADMIN'));
router.get('/', asyncHandler(c.list));
router.post('/staff', asyncHandler(c.createStaff));
router.post('/admins', asyncHandler(c.createAdmin));
router.post('/applications/:id/convert', asyncHandler(c.convertApplicant));

module.exports = router;
