import { getUserById, publicUser, sqlite } from "./sqliteStore.js";

function makeRequireAuth(getAuthUser) {
  return function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Faça login para usar as lives." });
    req.user = user;
    next();
  };
}

function initLiveStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS live_rooms (
      id INTEGER PRIMARY KEY,
      creator_user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'live',
      cover_url TEXT NOT NULL DEFAULT '',
      viewers INTEGER NOT NULL DEFAULT 0,
      gifts INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_chat_messages (
      id INTEGER PRIMARY KEY,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES live_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_viewers (
      id INTEGER PRIMARY KEY,
      room_id INTEGER NOT NULL,
      user_id INTEGER,
      visitor_id TEXT NOT NULL DEFAULT '',
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES live_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_live_rooms_status ON live_rooms(status);
    CREATE INDEX IF NOT EXISTS idx_live_chat_room ON live_chat_messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_live_viewers_room ON live_viewers(room_id);
  `);
}

function cleanText(value, max = 140) {
  return String(value || "").trim().slice(0, max);
}

function cleanVisitorId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
}

function roomPayload(row) {
  const creator = getUserById(row.creator_user_id);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    coverUrl: row.cover_url,
    viewers: Number(row.viewers || 0),
    gifts: Number(row.gifts || 0),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    creator: creator ? publicUser(creator) : null
  };
}

function messagePayload(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    user: row.user,
    name: row.name,
    avatar: row.avatar,
    text: row.text,
    createdAt: row.created_at
  };
}

function refreshRoomViewers(roomId) {
  const since = new Date(Date.now() - 45 * 1000).toISOString();
  const count = sqlite.prepare("SELECT COUNT(*) AS total FROM live_viewers WHERE room_id = ? AND last_seen_at >= ?").get(roomId, since).total;
  sqlite.prepare("UPDATE live_rooms SET viewers = ? WHERE id = ?").run(Number(count || 0), roomId);
  return Number(count || 0);
}

function getRoom(roomId) {
  return sqlite.prepare("SELECT * FROM live_rooms WHERE id = ?").get(roomId);
}

function activeRoomForUser(userId) {
  return sqlite.prepare("SELECT * FROM live_rooms WHERE creator_user_id = ? AND status = 'live' ORDER BY id DESC LIMIT 1").get(userId);
}

export function registerLiveRoomRoutes(app, getAuthUser) {
  initLiveStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/live/rooms", (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM live_rooms WHERE status = 'live' ORDER BY viewers DESC, gifts DESC, id DESC LIMIT 50").all();
    res.json(rows.map((row) => ({ ...roomPayload(row), viewers: refreshRoomViewers(row.id) })));
  });

  app.post("/api/live/rooms", requireAuth, (req, res) => {
    const existing = activeRoomForUser(req.user.id);
    if (existing) return res.json(roomPayload(existing));

    const title = cleanText(req.body.title, 80) || `Live de @${req.user.user}`;
    const coverUrl = cleanText(req.body.coverUrl, 500) || req.user.avatar;
    const result = sqlite.prepare(`
      INSERT INTO live_rooms (creator_user_id, title, cover_url, status, started_at)
      VALUES (?, ?, ?, 'live', ?)
    `).run(req.user.id, title, coverUrl, new Date().toISOString());

    const room = getRoom(Number(result.lastInsertRowid));
    res.status(201).json(roomPayload(room));
  });

  app.post("/api/live/rooms/:id/end", requireAuth, (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ error: "Live não encontrada." });
    if (room.creator_user_id !== req.user.id && req.user.user !== "ghost") return res.status(403).json({ error: "Você não pode encerrar essa live." });
    sqlite.prepare("UPDATE live_rooms SET status = 'ended', ended_at = ? WHERE id = ?").run(new Date().toISOString(), roomId);
    res.json(roomPayload(getRoom(roomId)));
  });

  app.get("/api/live/rooms/:id", (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ error: "Live não encontrada." });
    res.json({ ...roomPayload(room), viewers: refreshRoomViewers(roomId) });
  });

  app.post("/api/live/rooms/:id/join", (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!room || room.status !== "live") return res.status(404).json({ error: "Live não está ativa." });

    const user = getAuthUser(req);
    const visitorId = cleanVisitorId(req.body?.visitorId) || cleanVisitorId(req.headers["x-gxst-visitor"]) || cleanVisitorId(req.ip);
    const now = new Date().toISOString();

    const existing = user?.id
      ? sqlite.prepare("SELECT id FROM live_viewers WHERE room_id = ? AND user_id = ? LIMIT 1").get(roomId, user.id)
      : sqlite.prepare("SELECT id FROM live_viewers WHERE room_id = ? AND visitor_id = ? LIMIT 1").get(roomId, visitorId);

    if (existing) {
      sqlite.prepare("UPDATE live_viewers SET last_seen_at = ? WHERE id = ?").run(now, existing.id);
    } else {
      sqlite.prepare("INSERT INTO live_viewers (room_id, user_id, visitor_id, last_seen_at) VALUES (?, ?, ?, ?)").run(roomId, user?.id || null, visitorId, now);
    }

    res.json({ ok: true, viewers: refreshRoomViewers(roomId) });
  });

  app.get("/api/live/rooms/:id/chat", (req, res) => {
    const roomId = Number(req.params.id);
    const afterId = Math.max(0, Number(req.query.afterId || 0));
    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ error: "Live não encontrada." });
    const rows = sqlite.prepare("SELECT * FROM live_chat_messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 100").all(roomId, afterId);
    const latest = sqlite.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM live_chat_messages WHERE room_id = ?").get(roomId);
    res.json({ roomId, latestId: Number(latest?.id || 0), messages: rows.map(messagePayload) });
  });

  app.post("/api/live/rooms/:id/chat", requireAuth, (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!room || room.status !== "live") return res.status(404).json({ error: "Live não está ativa." });
    const text = cleanText(req.body.text, 220);
    if (!text) return res.status(400).json({ error: "Mensagem vazia." });

    const result = sqlite.prepare(`
      INSERT INTO live_chat_messages (room_id, user_id, user, name, avatar, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(roomId, req.user.id, req.user.user, req.user.name, req.user.avatar, text, new Date().toISOString());

    const message = sqlite.prepare("SELECT * FROM live_chat_messages WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json({ message: messagePayload(message) });
  });

  app.post("/api/live/rooms/:id/gift", requireAuth, (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!room || room.status !== "live") return res.status(404).json({ error: "Live não está ativa." });

    const amount = Math.max(1, Math.min(500, Number(req.body.amount || 10)));
    if (Number(req.user.coins || 0) < amount) return res.status(400).json({ error: "Moedas insuficientes." });

    sqlite.prepare("UPDATE users SET coins = coins - ? WHERE id = ?").run(amount, req.user.id);
    sqlite.prepare("UPDATE live_rooms SET gifts = gifts + ? WHERE id = ?").run(amount, roomId);

    const creator = getUserById(room.creator_user_id);
    if (creator && creator.id !== req.user.id) sqlite.prepare("UPDATE users SET coins = coins + ? WHERE id = ?").run(Math.floor(amount * 0.5), creator.id);

    const text = `@${req.user.user} enviou ${amount} moedas para a live.`;
    sqlite.prepare(`
      INSERT INTO live_chat_messages (room_id, user_id, user, name, avatar, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(roomId, req.user.id, req.user.user, req.user.name, req.user.avatar, text, new Date().toISOString());

    res.json({ room: roomPayload(getRoom(roomId)), user: publicUser(getUserById(req.user.id)) });
  });
}
