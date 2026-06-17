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

export function registerAuthRoutes(app) {
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
