const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/timesheets.controller');
router.use(authenticate, authorize('ADMIN'));
router.get('/', asyncHandler(c.list));
router.patch('/:id/status', asyncHandler(c.setStatus));
module.exports = router;
