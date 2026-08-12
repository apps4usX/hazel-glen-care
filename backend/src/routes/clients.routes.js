const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/clients.controller');
router.use(authenticate, authorize('ADMIN'));
router.get('/', asyncHandler(c.list));
module.exports = router;
