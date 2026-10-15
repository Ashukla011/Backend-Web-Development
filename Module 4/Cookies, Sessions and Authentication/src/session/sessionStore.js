const sessions = new Map();

function create(sid, session) {
  sessions.set(sid, session);
}

function get(sid) {
  const session = sessions.get(sid);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sid);
    return null;
  }

  return session;
}

function destroy(sid) {
  sessions.delete(sid);
}

module.exports = { create, get, destroy };
