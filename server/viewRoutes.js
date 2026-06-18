import { sqlite } from "./sqliteStore.js";

function initViewStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS video_views (
      id INTEGER PRIMARY KEY,
      video_id INTEGER NOT NULL,
      viewer_user_id INTEGER,
      visitor_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'feed',
      watch_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
    CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON video_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_video_views_visitor ON video_views(visitor_id);
  `);

  try {
    sqlite.prepare("ALTER TABLE videos ADD COLUMN views INTEGER DEFAULT 0").run();
  } catch {
    // column already exists
  }
}

function cleanVisitorId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);
}

function recentViewExists({ videoId, userId, visitorId }) {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  if (userId) {
    const row = sqlite.prepare("SELECT id FROM video_views WHERE video_id = ? AND viewer_user_id = ? AND created_at >= ? LIMIT 1").get(videoId, userId, since);
    if (row) return true;
  }
  if (visitorId) {
    const row = sqlite.prepare("SELECT id FROM video_views WHERE video_id = ? AND visitor_id = ? AND created_at >= ? LIMIT 1").get(videoId, visitorId, since);
    if (row) return true;
  }
  return false;
}

function viewStats(videoId) {
  const total = sqlite.prepare("SELECT COUNT(*) AS total FROM video_views WHERE video_id = ?").get(videoId).total;
  const uniqueVisitors = sqlite.prepare("SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'user-' || viewer_user_id)) AS total FROM video_views WHERE video_id = ?").get(videoId).total;
  return { total: Number(total || 0), uniqueVisitors: Number(uniqueVisitors || 0) };
}

export function registerViewRoutes(app, getAuthUser) {
  initViewStore();

  app.post("/api/videos/:id/view", (req, res) => {
    const videoId = Number(req.params.id);
    const video = sqlite.prepare("SELECT id FROM videos WHERE id = ?").get(videoId);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });

    const user = getAuthUser(req);
    const visitorId = cleanVisitorId(req.body?.visitorId) || cleanVisitorId(req.headers["x-gxst-visitor"]) || cleanVisitorId(req.ip);
    const source = String(req.body?.source || "feed").slice(0, 40);
    const watchMs = Math.max(0, Math.min(600000, Number(req.body?.watchMs || 0)));

    const alreadyCounted = recentViewExists({ videoId, userId: user?.id, visitorId });
    if (!alreadyCounted) {
      sqlite.prepare(`
        INSERT INTO video_views (video_id, viewer_user_id, visitor_id, source, watch_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(videoId, user?.id || null, visitorId, source, watchMs, new Date().toISOString());

      try {
        sqlite.prepare("UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = ?").run(videoId);
      } catch {
        // older database without views column
      }
    }

    res.json({ ok: true, counted: !alreadyCounted, videoId, views: viewStats(videoId) });
  });

  app.get("/api/videos/:id/views", (req, res) => {
    const videoId = Number(req.params.id);
    const video = sqlite.prepare("SELECT id FROM videos WHERE id = ?").get(videoId);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
    res.json({ videoId, views: viewStats(videoId) });
  });
}
