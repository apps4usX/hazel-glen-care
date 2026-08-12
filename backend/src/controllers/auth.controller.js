// Auth controller: register, login, current user.
const { prisma } = require('../config/db');
const { hashPassword, comparePassword, signToken } = require('../utils/auth');
const { ApiError } = require('../utils/http');

/** POST /api/auth/register  { email, password, role, firstName, lastName, clientId? } */
async function register(req, res) {
  const { email, password, role = 'STAFF', firstName, lastName, clientId } = req.body;
  if (!email || !password) throw ApiError.badRequest('email and password are required');
  if (!['ADMIN', 'STAFF', 'CLIENT'].includes(role)) throw ApiError.badRequest('invalid role');

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw ApiError.conflict('Email already registered');

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      // create the linked profile in the same transaction-ish call
      ...(role === 'STAFF' && {
        staff: { create: { firstName: firstName || '', lastName: lastName || '' } },
      }),
      ...(role === 'CLIENT' && clientId && {
        clientPortalUser: {
          create: { clientId, firstName: firstName || '', lastName: lastName || '', isPrimary: true },
        },
      }),
    },
  });

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

/** POST /api/auth/login  { email, password } */
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('email and password are required');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

/** GET /api/auth/me */
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { staff: true, clientPortalUser: { include: { client: true } } },
  });
  if (!user) throw ApiError.notFound('User not found');
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
}

module.exports = { register, login, me };
