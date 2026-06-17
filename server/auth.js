import bcrypt from "bcryptjs";
import {
  getUserById,
  getUserByUsername,
  normalizeUser,
  publicUser,
  rowToUser,
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
}
