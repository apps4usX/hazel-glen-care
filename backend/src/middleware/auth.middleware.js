// Authentication: verify the Bearer JWT and attach req.user = { id, role, email }.
const { verifyToken } = require('../utils/auth');
const { ApiError } = require('../utils/http');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (_e) {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

module.exports = { authenticate };
