// Admin clients listing (for pickers, finance, etc.)
const { prisma } = require('../config/db');
async function list(_req, res) {
  const clients = await prisma.client.findMany({
    where: { isActive: true }, orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true, city: true },
  });
  res.json({ clients });
}
module.exports = { list };
