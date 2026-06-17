import { requireAuth } from "./auth.js";
import { getUserById, publicUser, rowToVideo, sqlite } from "./sqliteStore.js";

function requireAdmin(req, res, next) {
  if (req.user?.user !== "ghost") return res.status(403).json({ error: "Acesso admin permitido apenas para @ghost." });
  next();
}

function initModerationStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY,
      video_id INTEGER NOT NULL,
      reporter_user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by INTEGER,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

function reportPayload(row) {
  const video = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(row.video_id);
  const reporter = getUserById(row.reporter_user_id);
  return {
    id: row.id,
    videoId: row.video_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reporter: publicUser(reporter),
    video: video ? rowToVideo(video, null) : null
  };
}

export function registerModerationRoutes(app) {
  initModerationStore();

  app.post("/api/videos/:id/report", requireAuth, (req, res) => {
    const videoId = Number(req.params.id);
    const reason = String(req.body.reason || "").trim();
    const details = String(req.body.details || "").trim();
    const video = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(videoId);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
    if (!reason) return res.status(400).json({ error: "Escolha um motivo para denunciar." });
    if (video.user_id === req.user.id) return res.status(400).json({ error: "Você não pode denunciar seu próprio vídeo." });

    const duplicate = sqlite.prepare("SELECT id FROM reports WHERE video_id = ? AND reporter_user_id = ? AND status = 'open'").get(videoId, req.user.id);
    if (duplicate) return res.status(409).json({ error: "Você já denunciou esse vídeo e ele está em análise." });

    const result = sqlite.prepare(`
      INSERT INTO reports (video_id, reporter_user_id, reason, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(videoId, req.user.id, reason, details, new Date().toISOString());

    const row = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json(reportPayload(row));
  });

  app.get("/api/admin/reports", requireAuth, requireAdmin, (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM reports ORDER BY id DESC LIMIT 100").all();
    res.json(rows.map(reportPayload));
  });

  app.post("/api/admin/reports/:id/status", requireAuth, requireAdmin, (req, res) => {
    const reportId = Number(req.params.id);
    const status = String(req.body.status || "reviewed");
    const allowed = ["open", "reviewed", "dismissed", "removed"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });
    const report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(reportId);
    if (!report) return res.status(404).json({ error: "Denúncia não encontrada." });

    if (status === "removed") {
      sqlite.prepare("DELETE FROM comments WHERE video_id = ?").run(report.video_id);
      sqlite.prepare("DELETE FROM videos WHERE id = ?").run(report.video_id);
    }

    sqlite.prepare("UPDATE reports SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?").run(status, new Date().toISOString(), req.user.id, reportId);
    const updated = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(reportId);
    res.json(reportPayload(updated));
  });
}
