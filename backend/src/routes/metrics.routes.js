const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/metrics.controller');

router.use(authenticate, authorize('ADMIN'));
router.get('/dashboard', asyncHandler(c.dashboard));

module.exports = router;
