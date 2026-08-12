// HTTP helpers: async handler wrapper + a typed ApiError for clean error flow.

/** Wrap an async route handler so thrown errors reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
  static badRequest(msg, d) { return new ApiError(400, msg, d); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg, d) { return new ApiError(409, msg, d); }
}

module.exports = { asyncHandler, ApiError };
