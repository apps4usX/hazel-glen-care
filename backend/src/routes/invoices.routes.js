const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/invoices.controller');

router.use(authenticate, authorize('ADMIN'));

router.get('/', asyncHandler(c.list));
router.get('/:id/pdf', asyncHandler(c.pdf));
router.get('/:id', asyncHandler(c.getOne));
router.post('/generate', asyncHandler(c.generate));
router.patch('/:id/status', asyncHandler(c.updateStatus));

module.exports = router;
