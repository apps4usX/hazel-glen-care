// Server entry point.
const app = require('./app');
const { env } = require('./config/env');
const logger = require('./config/logger');
const { prisma } = require('./config/db');

const server = app.listen(env.port, () => {
  logger.info(`Hazel Glen Care API listening on :${env.port} (${env.nodeEnv})`);
});

// Graceful shutdown.
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

module.exports = server;
