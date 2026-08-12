const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/directory.controller');
router.use(authenticate, authorize('ADMIN'));
router.get('/staff', asyncHandler(c.staff));
module.exports = router;
