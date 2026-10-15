const express = require('express');
const bcrypt = require('bcryptjs');
const requireSession = require('../middleware/requireSession.js');
const { randomBytes } = require('node:crypto');
const prisma = require('../db/prisma');

const router = express.Router();

const SESSION_AGE_MS = 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
};

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password.trim()
  ) {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Email and password are required'
      }
    });
  }

  const invalidCredentials = () => res.status(401).json({
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password'
    }
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true
      }
    });
    if (!user) return invalidCredentials();

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return invalidCredentials();

    const sid = randomBytes(32).toString('hex');
    req.app.locals.sessions.create(sid, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_AGE_MS
    });

    res.cookie('sid', sid, {
      ...COOKIE_OPTIONS,
      signed: true,
      maxAge: SESSION_AGE_MS
    });
    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireSession, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, name: true, email: true }
    });
    if (!user) {
      req.app.locals.sessions.destroy(req.auth.sid);
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  const sid = req.signedCookies?.sid;
  if (typeof sid === 'string' && sid) {
    req.app.locals.sessions.destroy(sid);
  }
  res.clearCookie('sid', { ...COOKIE_OPTIONS, signed: true });
  return res.status(204).end();
});

module.exports = router;
