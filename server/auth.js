import bcrypt from "bcryptjs";
import {
  getUserById,
  getUserByUsername,
  normalizeUser,
  publicUser,
  rowToUser,
  rowToVideo,
  sqlite,
  toJson
} from "./sqliteStore.js";

function makeToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function createSession(userId) {
  const token = makeToken();
  sqlite.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  sqlite.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, userId, new Date().toISOString());
  return token;
}

export function getAuthUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const session = sqlite.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  return session ? getUserById(session.user_id) : null;
}

export function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Faça login para continuar." });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.user !== "ghost") return res.status(403).json({ error: "Acesso admin permitido apenas para @ghost." });
  next();
}

function initNotificationStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY,
      recipient_user_id INTEGER NOT NULL,
      actor_user_id INTEGER,
      actor_user TEXT NOT NULL DEFAULT 'sistema',
      type TEXT NOT NULL,
      video_id INTEGER,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS notify_comment_insert
    AFTER INSERT ON comments
    WHEN (SELECT user_id FROM videos WHERE id = NEW.video_id) IS NOT NULL
      AND (SELECT user_id FROM videos WHERE id = NEW.video_id) != NEW.user_id
    BEGIN
      INSERT INTO notifications (recipient_user_id, actor_user_id, actor_user, type, video_id, message, created_at)
      VALUES ((SELECT user_id FROM videos WHERE id = NEW.video_id), NEW.user_id, NEW.user, 'comment', NEW.video_id, '@' || NEW.user || ' comentou no seu vídeo.', NEW.created_at);
    END;

    CREATE TRIGGER IF NOT EXISTS notify_like_update
    AFTER UPDATE OF likes ON videos
    WHEN NEW.likes > OLD.likes AND NEW.user_id IS NOT NULL
    BEGIN
      INSERT INTO notifications (recipient_user_id, actor_user_id, actor_user, type, video_id, message, created_at)
      VALUES (NEW.user_id, NULL, 'sistema', 'like', NEW.id, 'Seu vídeo recebeu uma nova curtida.', datetime('now'));
    END;

    CREATE TRIGGER IF NOT EXISTS notify_gift_update
    AFTER UPDATE OF gifts ON videos
    WHEN NEW.gifts > OLD.gifts AND NEW.user_id IS NOT NULL
    BEGIN
      INSERT INTO notifications (recipient_user_id, actor_user_id, actor_user, type, video_id, message, created_at)
      VALUES (NEW.user_id, NULL, 'sistema', 'gift', NEW.id, 'Seu vídeo recebeu um presente.', datetime('now'));
    END;
  `);
}

function createNotification({ recipientUserId, actorUserId = null, actorUser = "sistema", type, videoId = null, message }) {
  if (!recipientUserId || !type || !message) return;
  sqlite.prepare(`
    INSERT INTO notifications (recipient_user_id, actor_user_id, actor_user, type, video_id, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(recipientUserId, actorUserId, actorUser, type, videoId, message, new Date().toISOString());
}

function notificationPayload(row) {
  return {
    id: row.id,
    actorUser: row.actor_user,
    type: row.type,
    videoId: row.video_id,
    message: row.message,
    read: Boolean(row.read_at),
    createdAt: row.created_at
  };
}

function profileFromVideo(username) {
  const row = sqlite.prepare("SELECT * FROM videos WHERE user = ? ORDER BY id DESC LIMIT 1").get(username);
  if (!row) return null;
  return {
    id: row.user_id || 0,
    user: row.user,
    name: row.name,
    bio: "Perfil público do GXST Vibes.",
    avatar: row.avatar,
    coins: 0,
    followers: 0,
    followingUsers: [],
    likedVideos: [],
    savedVideos: []
  };
}

function publicProfilePayload(username, viewer = null) {
  const cleanUser = String(username || "").replace("@", "").trim().toLowerCase();
  const user = getUserByUsername(cleanUser) || profileFromVideo(cleanUser);
  if (!user) return null;
  const rows = sqlite.prepare("SELECT * FROM videos WHERE user = ? ORDER BY id DESC").all(cleanUser);
  const likes = rows.reduce((sum, video) => sum + Number(video.likes || 0), 0);
  const gifts = rows.reduce((sum, video) => sum + Number(video.gifts || 0), 0);
  return {
    profile: publicUser(user),
    stats: {
      videos: rows.length,
      likes,
      gifts,
      points: likes + gifts,
      followers: user.followers || 0,
      following: Boolean(viewer?.followingUsers?.includes(cleanUser))
    },
    videos: rows.map((row) => rowToVideo(row, viewer))
  };
}

export function registerAuthRoutes(app) {
  initNotificationStore();

  app.post("/api/auth/register", (req, res) => {
    const userName = normalizeUser(req.body.user);
    const name = String(req.body.name || "").trim();
    const secret = String(req.body.password || "");

    if (!userName || userName.length < 3) return res.status(400).json({ error: "Usuário precisa ter pelo menos 3 caracteres." });
    if (!name) return res.status(400).json({ error: "Informe seu nome." });
    if (secret.length < 6) return res.status(400).json({ error: "Senha precisa ter pelo menos 6 caracteres." });
    if (getUserByUsername(userName)) return res.status(409).json({ error: "Esse usuário já existe." });

    const avatar = `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(userName)}`;
    const result = sqlite.prepare(`
      INSERT INTO users (user, name, bio, avatar, coins, followers, following_users, liked_videos, saved_videos, credential_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userName, name, "Novo creator do GXST Vibes.", avatar, 250, 0, toJson([]), toJson([]), toJson([]), bcrypt.hashSync(secret, 10), new Date().toISOString());

    const user = getUserById(Number(result.lastInsertRowid));
    const token = createSession(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  });

  app.post("/api/auth/login", (req, res) => {
    const userName = normalizeUser(req.body.user);
    const secret = String(req.body.password || "");
    const row = sqlite.prepare("SELECT * FROM users WHERE user = ?").get(userName);
    if (!row || !bcrypt.compareSync(secret, row.credential_hash)) return res.status(401).json({ error: "Usuário ou senha inválidos." });

    const user = rowToUser(row);
    const token = createSession(user.id);
    res.json({ token, user: publicUser(user) });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => res.json(publicUser(req.user)));

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    sqlite.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    res.json({ ok: true });
  });

  app.get("/api/notifications", requireAuth, (req, res) => {
    const rows = sqlite.prepare("SELECT * FROM notifications WHERE recipient_user_id = ? ORDER BY id DESC LIMIT 50").all(req.user.id);
    const unread = sqlite.prepare("SELECT COUNT(*) AS total FROM notifications WHERE recipient_user_id = ? AND read_at IS NULL").get(req.user.id).total;
    res.json({ unread, notifications: rows.map(notificationPayload) });
  });

  app.post("/api/notifications/:id/read", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    sqlite.prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND recipient_user_id = ?").run(new Date().toISOString(), id, req.user.id);
    res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", requireAuth, (req, res) => {
    sqlite.prepare("UPDATE notifications SET read_at = ? WHERE recipient_user_id = ? AND read_at IS NULL").run(new Date().toISOString(), req.user.id);
    res.json({ ok: true });
  });

  app.get("/api/public/profile/:user", (req, res) => {
    const viewer = getAuthUser(req);
    const payload = publicProfilePayload(req.params.user, viewer);
    if (!payload) return res.status(404).json({ error: "Perfil não encontrado." });
    res.json(payload);
  });

  app.post("/api/public/profile/:user/follow", requireAuth, (req, res) => {
    const targetUser = normalizeUser(req.params.user);
    if (!targetUser) return res.status(400).json({ error: "Usuário inválido." });
    if (targetUser === req.user.user) return res.status(400).json({ error: "Você não pode seguir você mesmo." });
    const target = getUserByUsername(targetUser);
    if (!target && !profileFromVideo(targetUser)) return res.status(404).json({ error: "Perfil não encontrado." });
    const following = req.user.followingUsers || [];
    const has = following.includes(targetUser);
    const next = has ? following.filter((item) => item !== targetUser) : [...following, targetUser];
    sqlite.prepare("UPDATE users SET following_users = ? WHERE id = ?").run(toJson(next), req.user.id);
    if (target) {
      sqlite.prepare("UPDATE users SET followers = ? WHERE id = ?").run(Math.max(0, Number(target.followers || 0) + (has ? -1 : 1)), target.id);
      if (!has) {
        createNotification({
          recipientUserId: target.id,
          actorUserId: req.user.id,
          actorUser: req.user.user,
          type: "follow",
          message: `@${req.user.user} começou a seguir você.`
        });
      }
    }
    const viewer = getUserByUsername(req.user.user);
    const payload = publicProfilePayload(targetUser, viewer);
    res.json(payload);
  });

  app.get("/api/admin/summary", requireAuth, requireAdmin, (_req, res) => {
    res.json({
      users: sqlite.prepare("SELECT COUNT(*) AS total FROM users").get().total,
      videos: sqlite.prepare("SELECT COUNT(*) AS total FROM videos").get().total,
      comments: sqlite.prepare("SELECT COUNT(*) AS total FROM comments").get().total,
      coins: sqlite.prepare("SELECT COALESCE(SUM(coins), 0) AS total FROM users").get().total
    });
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM users ORDER BY id DESC").all();
    res.json(rows.map((row) => publicUser(rowToUser(row))));
  });

  app.get("/api/admin/videos", requireAuth, requireAdmin, (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM videos ORDER BY id DESC").all();
    res.json(rows.map((row) => rowToVideo(row, null)));
  });

  app.post("/api/admin/users/:id/coins", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const amount = Number(req.body.amount || 0);
    const row = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Usuário não encontrado." });
    const nextCoins = Math.max(0, Number(row.coins || 0) + amount);
    sqlite.prepare("UPDATE users SET coins = ? WHERE id = ?").run(nextCoins, id);
    const updated = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id);
    res.json(publicUser(rowToUser(updated)));
  });

  app.delete("/api/admin/videos/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
    sqlite.prepare("DELETE FROM comments WHERE video_id = ?").run(id);
    sqlite.prepare("DELETE FROM videos WHERE id = ?").run(id);
    res.json({ ok: true, deletedId: id });
  });
}
