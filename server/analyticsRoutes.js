import { publicUser, rowToVideo, sqlite } from "./sqliteStore.js";

function makeRequireAuth(getAuthUser) {
  return function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Faça login para continuar." });
    req.user = user;
    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user?.user !== "ghost") return res.status(403).json({ error: "Acesso admin permitido apenas para @ghost." });
  next();
}

function safeGet(sql, params = []) {
  try {
    return sqlite.prepare(sql).get(...params) || {};
  } catch {
    return {};
  }
}

function safeAll(sql, params = []) {
  try {
    return sqlite.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

function number(value) {
  return Number(value || 0);
}

function viewsForVideo(videoId) {
  return number(safeGet("SELECT COUNT(*) AS total FROM video_views WHERE video_id = ?", [videoId]).total);
}

function viewsForCreator(userId) {
  return number(safeGet("SELECT COUNT(*) AS total FROM video_views WHERE video_id IN (SELECT id FROM videos WHERE user_id = ?)", [userId]).total);
}

function videoScore(row) {
  return number(row.likes) + number(row.comments) * 2 + number(row.shares) * 4 + number(row.gifts) * 5 + viewsForVideo(row.id);
}

function creatorSummary(userId) {
  const row = safeGet(`
    SELECT
      COUNT(*) AS videos,
      COALESCE(SUM(likes), 0) AS likes,
      COALESCE(SUM(comments), 0) AS comments,
      COALESCE(SUM(shares), 0) AS shares,
      COALESCE(SUM(gifts), 0) AS gifts
    FROM videos
    WHERE user_id = ?
  `, [userId]);

  const views = viewsForCreator(userId);
  const pendingPayouts = safeGet("SELECT COALESCE(SUM(amount), 0) AS total FROM payout_requests WHERE user_id = ? AND status = 'pending'", [userId]).total;
  const paidPayouts = safeGet("SELECT COALESCE(SUM(amount), 0) AS total FROM payout_requests WHERE user_id = ? AND status = 'approved'", [userId]).total;
  const paidPayments = safeGet("SELECT COUNT(*) AS total FROM payments WHERE user_id = ? AND status = 'paid'", [userId]).total;

  const gifts = number(row.gifts);
  const estimatedEarnings = Math.floor(gifts * 0.5);

  return {
    videos: number(row.videos),
    views,
    likes: number(row.likes),
    comments: number(row.comments),
    shares: number(row.shares),
    gifts,
    score: number(row.likes) + number(row.comments) * 2 + number(row.shares) * 4 + gifts * 5 + views,
    estimatedEarnings,
    pendingPayouts: number(pendingPayouts),
    paidPayouts: number(paidPayouts),
    paidPayments: number(paidPayments)
  };
}

function lastSevenDays() {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

function creatorTimeline(userId) {
  const days = lastSevenDays();
  const videos = safeAll("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total FROM videos WHERE user_id = ? GROUP BY day", [userId]);
  const comments = safeAll("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total FROM comments WHERE video_id IN (SELECT id FROM videos WHERE user_id = ?) GROUP BY day", [userId]);
  const views = safeAll("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total FROM video_views WHERE video_id IN (SELECT id FROM videos WHERE user_id = ?) GROUP BY day", [userId]);

  return days.map((day) => ({
    day,
    videos: number(videos.find((item) => item.day === day)?.total),
    views: number(views.find((item) => item.day === day)?.total),
    comments: number(comments.find((item) => item.day === day)?.total)
  }));
}

function topCreatorVideos(userId) {
  return safeAll("SELECT * FROM videos WHERE user_id = ?", [userId])
    .sort((a, b) => videoScore(b) - videoScore(a))
    .slice(0, 8)
    .map((row) => ({ ...rowToVideo(row, null), views: viewsForVideo(row.id), performanceScore: videoScore(row) }));
}

export function registerAnalyticsRoutes(app, getAuthUser) {
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/analytics/creator", requireAuth, (req, res) => {
    res.json({
      user: publicUser(req.user),
      summary: creatorSummary(req.user.id),
      timeline: creatorTimeline(req.user.id),
      topVideos: topCreatorVideos(req.user.id)
    });
  });

  app.get("/api/admin/analytics", requireAuth, requireAdmin, (_req, res) => {
    const totals = {
      users: number(safeGet("SELECT COUNT(*) AS total FROM users").total),
      videos: number(safeGet("SELECT COUNT(*) AS total FROM videos").total),
      views: number(safeGet("SELECT COUNT(*) AS total FROM video_views").total),
      uniqueViewers: number(safeGet("SELECT COUNT(DISTINCT COALESCE(NULLIF(visitor_id, ''), 'user-' || viewer_user_id)) AS total FROM video_views").total),
      comments: number(safeGet("SELECT COUNT(*) AS total FROM comments").total),
      likes: number(safeGet("SELECT COALESCE(SUM(likes), 0) AS total FROM videos").total),
      shares: number(safeGet("SELECT COALESCE(SUM(shares), 0) AS total FROM videos").total),
      gifts: number(safeGet("SELECT COALESCE(SUM(gifts), 0) AS total FROM videos").total),
      payments: number(safeGet("SELECT COUNT(*) AS total FROM payments").total),
      paidPayments: number(safeGet("SELECT COUNT(*) AS total FROM payments WHERE status = 'paid'").total),
      revenue: number(safeGet("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payments WHERE status = 'paid'").total) / 100,
      openReports: number(safeGet("SELECT COUNT(*) AS total FROM reports WHERE status = 'open'").total),
      pendingPayouts: number(safeGet("SELECT COUNT(*) AS total FROM payout_requests WHERE status = 'pending'").total)
    };

    const topVideos = safeAll("SELECT * FROM videos")
      .sort((a, b) => videoScore(b) - videoScore(a))
      .slice(0, 10)
      .map((row) => ({ ...rowToVideo(row, null), views: viewsForVideo(row.id), performanceScore: videoScore(row) }));

    const topCreators = safeAll(`
      SELECT
        user_id,
        user,
        name,
        avatar,
        COUNT(*) AS videos,
        COALESCE(SUM(likes), 0) AS likes,
        COALESCE(SUM(comments), 0) AS comments,
        COALESCE(SUM(shares), 0) AS shares,
        COALESCE(SUM(gifts), 0) AS gifts
      FROM videos
      GROUP BY user_id, user, name, avatar
    `).map((row) => {
      const views = viewsForCreator(row.user_id);
      return {
        ...row,
        videos: number(row.videos),
        views,
        likes: number(row.likes),
        comments: number(row.comments),
        shares: number(row.shares),
        gifts: number(row.gifts),
        score: number(row.likes) + number(row.comments) * 2 + number(row.shares) * 4 + number(row.gifts) * 5 + views
      };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    res.json({ totals, topCreators, topVideos });
  });
}
