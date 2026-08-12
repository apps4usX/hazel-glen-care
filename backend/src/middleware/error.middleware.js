// 404 + centralised error handler. Keep this last in the middleware chain.
const logger = require('../config/logger');

function notFound(req, res, _next) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) logger.error(err.stack || err.message);
  else logger.warn(`${status} ${req.method} ${req.originalUrl} — ${err.message}`);

  // Map common Prisma errors to friendly statuses.
  let message = err.message || 'Internal server error';
  let code = status;
  if (err.code === 'P2002') { code = 409; message = 'A record with that value already exists'; }
  if (err.code === 'P2025') { code = 404; message = 'Record not found'; }

  res.status(code).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV === 'development' && code >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
