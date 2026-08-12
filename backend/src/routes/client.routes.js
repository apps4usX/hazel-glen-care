const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/client.controller');

router.use(authenticate, authorize('CLIENT'));

router.get('/me', asyncHandler(c.me));
router.get('/shift-requests', asyncHandler(c.listRequests));
router.post('/shift-requests', asyncHandler(c.createRequest));

module.exports = router;
