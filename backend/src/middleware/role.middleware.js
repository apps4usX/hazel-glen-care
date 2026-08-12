// Role-based access control. Use after `authenticate`.
//   router.post('/', authenticate, authorize('ADMIN'), handler)
const { ApiError } = require('../utils/http');

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = { authorize };
