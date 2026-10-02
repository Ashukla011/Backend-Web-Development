// TODO: read req.signedCookies.sid, resolve the server session,
// attach identity to the request, and return generic 401 when invalid.


module.exports = function requireSession(req, res, next) {
  const sid = req.signedCookies?.sid;
  const session = sid && req.app.locals.sessions.get(sid);

  if(!session || session.expiresAt <= Date.now()){
    if(session) req.app.locals.sessions.delete(sid);
    
    return res.status(401).json({
      error:{
        code:"UNAUTHENTICATED",
        message:'Authentication required'
      }
    })
  }

  req.auth = {userid: session.userid, sid};
  return next();
};
