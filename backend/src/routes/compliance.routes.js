const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/compliance.controller');

router.use(authenticate, authorize('ADMIN'));

router.get('/staff/:staffId', asyncHandler(c.checkStaff));
router.post('/scan', asyncHandler(c.scan));
router.post('/remind', asyncHandler(c.remind));

module.exports = router;
