/**
 * Production admin bootstrap — creates (or updates) a single real admin login
 * without any demo data. Run once after the first production deploy:
 *
 *   ADMIN_EMAIL="you@hazelglencare.co.za" ADMIN_PASSWORD="a-strong-password" \
 *     node prisma/create-admin.js
 *
 * Safe to re-run: it upserts the admin and (if the password is given) resets it.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('✗ Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables first.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('✗ ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', isActive: true },
    create: { email, passwordHash, role: 'ADMIN' },
  });

  console.log(`✓ Admin ready: ${user.email}`);
  console.log('  Sign in at your web URL → /login, then add staff & clients from the Team page.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
