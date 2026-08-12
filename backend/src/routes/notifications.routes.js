const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const c = require('../controllers/notifications.controller');

router.use(authenticate);
router.get('/', asyncHandler(c.list));
router.post('/:id/read', asyncHandler(c.markRead));

module.exports = router;
