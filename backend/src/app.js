// Express application wiring.
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env');
const routes = require('./routes');
const { UPLOAD_ROOT } = require('./utils/media');
const { authenticate } = require('./middleware/auth.middleware');
const { authorize } = require('./middleware/role.middleware');
const { ApiError } = require('./utils/http');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Behind Render/any proxy, trust the first hop so req.ip is the real client IP.
app.set('trust proxy', 1);

// helmet default CORP blocks cross-origin <img> loads (portal on :3000 pulling
// images from the API on :4000); relax just that so uploaded images render.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigin, credentials: true }));
// Selfie clock-ins post a base64 data URL, so allow a larger JSON body.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Profile photos are low-sensitivity (chosen avatars) — served statically.
app.use('/uploads/profiles', express.static(path.join(UPLOAD_ROOT, 'profiles'), { maxAge: '1d' }));

// Attendance selfies are biometric personal information (POPIA) — admin-only,
// streamed through an authenticated route, never publicly cached.
app.get('/uploads/attendance/:file', authenticate, authorize('ADMIN'), (req, res, next) => {
  const dir = path.join(UPLOAD_ROOT, 'attendance');
  const fp = path.join(dir, path.basename(req.params.file));
  if (!fp.startsWith(dir)) return next(ApiError.forbidden('Invalid path'));
  res.set('Cache-Control', 'private, no-store');
  return res.sendFile(fp, (err) => { if (err) next(ApiError.notFound('Image not found')); });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
