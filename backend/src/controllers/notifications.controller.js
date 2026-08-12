// Notifications for the signed-in user (any role).
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');

/** GET /api/notifications */
async function list(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.isRead).length;
  res.json({ notifications, unread });
}

/** POST /api/notifications/:id/read */
async function markRead(req, res) {
  const notif = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!notif) throw ApiError.notFound('Notification not found');
  const updated = await prisma.notification.update({
    where: { id: notif.id },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ notification: updated });
}

module.exports = { list, markRead };
