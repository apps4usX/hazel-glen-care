// Tiny leveled logger (swap for pino/winston later without changing call sites).
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, ...args) {
  if (LEVELS[level] <= current) {
    const ts = new Date().toISOString();
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`[${ts}] ${level.toUpperCase()}`, ...args);
  }
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
};
