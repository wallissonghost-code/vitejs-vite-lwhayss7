import { commentsForVideo, rowToVideo, sqlite } from "./sqliteStore.js";

function makeRequireAuth(getAuthUser) {
  return function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Faça login para comentar." });
    req.user = user;
    next();
  };
}

function commentPayload(comment) {
  return {
    id: comment.id,
    videoId: comment.video_id,
    user: comment.user,
    name: comment.name,
    avatar: comment.avatar,
    text: comment.text,
    createdAt: comment.created_at
  };
}

function latestCommentId(videoId) {
  const row = sqlite.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM comments WHERE video_id = ?").get(videoId);
  return Number(row?.id || 0);
}

export function registerLiveCommentRoutes(app, getAuthUser) {
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/videos/:id/comments/live", (req, res) => {
    const videoId = Number(req.params.id);
    const afterId = Math.max(0, Number(req.query.afterId || 0));
    const video = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(videoId);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });

    const rows = sqlite.prepare("SELECT * FROM comments WHERE video_id = ? AND id > ? ORDER BY id ASC LIMIT 80").all(videoId, afterId);
    res.json({
      videoId,
      total: Number(video.comments || 0),
      latestId: latestCommentId(videoId),
      comments: rows.map(commentPayload)
    });
  });

  app.get("/api/comments/live/summary", (req, res) => {
    const sinceId = Math.max(0, Number(req.query.sinceId || 0));
    const rows = sqlite.prepare(`
      SELECT comments.*, videos.caption AS video_caption
      FROM comments
      JOIN videos ON videos.id = comments.video_id
      WHERE comments.id > ?
      ORDER BY comments.id DESC
      LIMIT 30
    `).all(sinceId);
    res.json({
      latestId: Number(rows[0]?.id || sinceId),
      comments: rows.map((row) => ({ ...commentPayload(row), videoCaption: row.video_caption }))
    });
  });

  app.post("/api/videos/:id/comments/live", requireAuth, (req, res) => {
    const videoId = Number(req.params.id);
    const text = String(req.body.text || "").trim();
    const video = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(videoId);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
    if (!text) return res.status(400).json({ error: "Comentário vazio." });
    if (text.length > 300) return res.status(400).json({ error: "Comentário muito grande. Use até 300 caracteres." });

    const result = sqlite.prepare(`
      INSERT INTO comments (video_id, user_id, user, name, avatar, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(videoId, req.user.id, req.user.user, req.user.name, req.user.avatar, text, new Date().toISOString());

    sqlite.prepare("UPDATE videos SET comments = comments + 1 WHERE id = ?").run(videoId);

    const comment = sqlite.prepare("SELECT * FROM comments WHERE id = ?").get(Number(result.lastInsertRowid));
    const updatedVideo = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(videoId);
    res.status(201).json({
      comment: commentPayload(comment),
      latestId: latestCommentId(videoId),
      video: rowToVideo(updatedVideo, req.user),
      comments: commentsForVideo(videoId)
    });
  });
}
