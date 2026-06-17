import { requireAuth } from "./auth.js";
import { publicUser, rowToUser, rowToVideo, sqlite } from "./sqliteStore.js";

function requireAdmin(req, res, next) {
  if (req.user?.user !== "ghost") {
    return res.status(403).json({ error: "Acesso admin permitido apenas para @ghost." });
  }
  next();
}

export function registerAdminRoutes(app) {
  app.get("/api/admin/summary", requireAuth, requireAdmin, (_req, res) => {
    const users = sqlite.prepare("SELECT COUNT(*) AS total FROM users").get().total;
    const videos = sqlite.prepare("SELECT COUNT(*) AS total FROM videos").get().total;
    const comments = sqlite.prepare("SELECT COUNT(*) AS total FROM comments").get().total;
    const coins = sqlite.prepare("SELECT COALESCE(SUM(coins), 0) AS total FROM users").get().total;
    res.json({ users, videos, comments, coins });
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
