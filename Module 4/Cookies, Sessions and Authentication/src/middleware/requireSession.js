function requireSession(req, res, next) {
  const sid = req.signedCookies?.sid;
  const session = sid && req.app.locals.sessions.get(sid);

  if (!session) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }

  req.auth = { userId: session.userId, sid };
  return next();
}

module.exports = requireSession;