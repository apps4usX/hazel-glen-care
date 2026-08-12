const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/shifts.controller');

router.use(authenticate);

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getOne));
router.get('/:id/candidates', authorize('ADMIN'), asyncHandler(c.candidates));

router.post('/', authorize('ADMIN'), asyncHandler(c.create));
router.patch('/:id', authorize('ADMIN'), asyncHandler(c.update));
router.delete('/:id', authorize('ADMIN'), asyncHandler(c.cancel));

router.post('/:id/auto-assign', authorize('ADMIN'), asyncHandler(c.autoAssign));
router.post('/:id/broadcast', authorize('ADMIN'), asyncHandler(c.broadcast));

module.exports = router;
