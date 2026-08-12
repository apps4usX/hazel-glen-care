const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { rateLimit } = require('../middleware/rateLimit.middleware');
const c = require('../controllers/auth.controller');

// Throttle login to slow brute-force: max 8 tries per 15 min per IP + email.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyFn: (req) => `${req.ip}:${(req.body && req.body.email ? req.body.email : '').toLowerCase()}`,
});

// Account creation is admin-only (staff/clients are added from the Team page).
// This prevents anyone from self-registering against the public API.
router.post('/register', authenticate, authorize('ADMIN'), asyncHandler(c.register));
router.post('/login', loginLimiter, asyncHandler(c.login));
router.get('/me', authenticate, asyncHandler(c.me));

module.exports = router;
