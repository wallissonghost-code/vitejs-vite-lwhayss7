import { getUserById, getUserByUsername, publicUser, sqlite } from "./sqliteStore.js";

function makeRequireAuth(getAuthUser) {
  return function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Faça login para usar o chat." });
    req.user = user;
    next();
  };
}

function initDirectMessageStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id INTEGER PRIMARY KEY,
      sender_user_id INTEGER NOT NULL,
      recipient_user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read_at TEXT,
      FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_user_id);
    CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at);
  `);
}

function userByIdPublic(id) {
  return publicUser(getUserById(id));
}

function messagePayload(row) {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    readAt: row.read_at,
    sender: userByIdPublic(row.sender_user_id),
    recipient: userByIdPublic(row.recipient_user_id),
    senderId: row.sender_user_id,
    recipientId: row.recipient_user_id
  };
}

function findChatUser(username, currentUserId) {
  const clean = String(username || "").replace("@", "").trim().toLowerCase();
  const user = getUserByUsername(clean);
  if (!user) return null;
  if (user.id === currentUserId) return null;
  return user;
}

function notifyDirectMessage({ recipientId, actorId, actorUser, createdAt }) {
  try {
    sqlite.prepare(`
      INSERT INTO notifications (recipient_user_id, actor_user_id, actor_user, type, video_id, message, created_at)
      VALUES (?, ?, ?, 'dm', NULL, ?, ?)
    `).run(recipientId, actorId, actorUser, `@${actorUser} enviou uma mensagem privada.`, createdAt);
  } catch {
    // notifications table is initialized by auth routes; ignore if unavailable
  }
}

function threadSummaryForUser(currentUserId, otherUserId) {
  const last = sqlite.prepare(`
    SELECT * FROM direct_messages
    WHERE (sender_user_id = ? AND recipient_user_id = ?)
       OR (sender_user_id = ? AND recipient_user_id = ?)
    ORDER BY id DESC
    LIMIT 1
  `).get(currentUserId, otherUserId, otherUserId, currentUserId);

  const unread = sqlite.prepare(`
    SELECT COUNT(*) AS total FROM direct_messages
    WHERE sender_user_id = ? AND recipient_user_id = ? AND read_at IS NULL
  `).get(otherUserId, currentUserId).total;

  return {
    user: userByIdPublic(otherUserId),
    lastMessage: last ? messagePayload(last) : null,
    unread: Number(unread || 0)
  };
}

export function registerDirectMessageRoutes(app, getAuthUser) {
  initDirectMessageStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/dm/users", requireAuth, (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const rows = q
      ? sqlite.prepare("SELECT * FROM users WHERE id != ? AND (user LIKE ? OR name LIKE ?) ORDER BY user ASC LIMIT 30").all(req.user.id, `%${q}%`, `%${q}%`)
      : sqlite.prepare("SELECT * FROM users WHERE id != ? ORDER BY id DESC LIMIT 30").all(req.user.id);
    res.json(rows.map((row) => publicUser({
      id: row.id,
      user: row.user,
      name: row.name,
      bio: row.bio,
      avatar: row.avatar,
      coins: row.coins,
      followers: row.followers,
      followingUsers: [],
      likedVideos: [],
      savedVideos: []
    })));
  });

  app.get("/api/dm/threads", requireAuth, (req, res) => {
    const rows = sqlite.prepare(`
      SELECT
        CASE WHEN sender_user_id = ? THEN recipient_user_id ELSE sender_user_id END AS other_user_id,
        MAX(id) AS last_id
      FROM direct_messages
      WHERE sender_user_id = ? OR recipient_user_id = ?
      GROUP BY other_user_id
      ORDER BY last_id DESC
      LIMIT 50
    `).all(req.user.id, req.user.id, req.user.id);

    res.json(rows.map((row) => threadSummaryForUser(req.user.id, row.other_user_id)).filter((item) => item.user));
  });

  app.get("/api/dm/thread/:username", requireAuth, (req, res) => {
    const other = findChatUser(req.params.username, req.user.id);
    if (!other) return res.status(404).json({ error: "Usuário não encontrado para conversa." });
    const afterId = Math.max(0, Number(req.query.afterId || 0));
    const rows = sqlite.prepare(`
      SELECT * FROM direct_messages
      WHERE id > ? AND (
        (sender_user_id = ? AND recipient_user_id = ?)
        OR (sender_user_id = ? AND recipient_user_id = ?)
      )
      ORDER BY id ASC
      LIMIT 100
    `).all(afterId, req.user.id, other.id, other.id, req.user.id);

    const latest = sqlite.prepare(`
      SELECT COALESCE(MAX(id), 0) AS id FROM direct_messages
      WHERE (sender_user_id = ? AND recipient_user_id = ?)
         OR (sender_user_id = ? AND recipient_user_id = ?)
    `).get(req.user.id, other.id, other.id, req.user.id);

    res.json({
      user: publicUser(other),
      latestId: Number(latest?.id || 0),
      messages: rows.map(messagePayload)
    });
  });

  app.post("/api/dm/thread/:username", requireAuth, (req, res) => {
    const other = findChatUser(req.params.username, req.user.id);
    if (!other) return res.status(404).json({ error: "Usuário não encontrado para conversa." });
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Mensagem vazia." });
    if (text.length > 500) return res.status(400).json({ error: "Mensagem muito grande. Use até 500 caracteres." });

    const createdAt = new Date().toISOString();
    const result = sqlite.prepare(`
      INSERT INTO direct_messages (sender_user_id, recipient_user_id, text, created_at)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, other.id, text, createdAt);

    notifyDirectMessage({ recipientId: other.id, actorId: req.user.id, actorUser: req.user.user, createdAt });

    const row = sqlite.prepare("SELECT * FROM direct_messages WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json({ message: messagePayload(row), thread: threadSummaryForUser(req.user.id, other.id) });
  });

  app.post("/api/dm/thread/:username/read", requireAuth, (req, res) => {
    const other = findChatUser(req.params.username, req.user.id);
    if (!other) return res.status(404).json({ error: "Usuário não encontrado para conversa." });
    sqlite.prepare(`
      UPDATE direct_messages
      SET read_at = COALESCE(read_at, ?)
      WHERE sender_user_id = ? AND recipient_user_id = ? AND read_at IS NULL
    `).run(new Date().toISOString(), other.id, req.user.id);
    res.json({ ok: true, thread: threadSummaryForUser(req.user.id, other.id) });
  });
}
