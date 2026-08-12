// Attendance media storage.
// Selfies arrive from the browser as base64 data URLs. Rather than keeping the
// (large) base64 blob inside the database row, we decode it once, write it to
// disk under /uploads/attendance, and store only the short public URL path.
// This keeps the DB small and lets the images be served as normal static files.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve an uploads dir that survives both `node src/server.js` and Docker.
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Persist a data-URL selfie to disk and return its public URL path
 * (e.g. "/uploads/attendance/ab12….jpg"). If the input is already a plain
 * URL/path (not a data URL), it is returned unchanged. Returns null for empty.
 *
 * @param {string|null|undefined} dataUrl
 * @param {string} prefix  filename hint, e.g. "checkin"/"checkout"/"staff"
 * @param {string} subdir  folder under /uploads, e.g. "attendance"/"profiles"
 */
function saveDataUrl(dataUrl, prefix = 'shot', subdir = 'attendance') {
  if (!dataUrl) return null;
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return dataUrl; // already a URL/path — leave it be

  const mime = match[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error('Unsupported image type');

  const buffer = Buffer.from(match[2], 'base64');
  // Guard against oversized uploads (~4MB of raw image is plenty for a photo).
  if (buffer.length > 4 * 1024 * 1024) throw new Error('Image too large');

  const dir = path.join(UPLOAD_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/uploads/${subdir}/${name}`;
}

module.exports = { saveDataUrl, UPLOAD_ROOT };
