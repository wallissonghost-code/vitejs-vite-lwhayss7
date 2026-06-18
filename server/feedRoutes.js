import { registerAnalyticsRoutes } from "./analyticsRoutes.js";
import { registerLiveCommentRoutes } from "./liveCommentRoutes.js";
import { registerModerationRoutes } from "./moderationRoutes.js";
import { registerMonetizationRoutes } from "./monetizationRoutes.js";
import { registerPaymentRoutes } from "./paymentRoutes.js";
import { registerViewRoutes } from "./viewRoutes.js";
import { fromJson, rowToVideo, scoreVideo, sqlite } from "./sqliteStore.js";

let extraRoutesRegistered = false;

function daysSince(value) {
  const date = new Date(value || Date.now());
  const diff = Date.now() - date.getTime();
  return Math.max(0, diff / 86400000);
}

function buildInterestMap(rows, ids) {
  const tags = new Map();
  const creators = new Map();
  const selected = rows.filter((row) => ids.includes(Number(row.id)));

  selected.forEach((row) => {
    creators.set(row.user, (creators.get(row.user) || 0) + 1);
    fromJson(row.tags, []).forEach((tag) => tags.set(tag, (tags.get(tag) || 0) + 1));
  });

  return { tags, creators };
}

function algorithmScore(row, viewer, interests) {
  const tags = fromJson(row.tags, []);
  const followingUsers = viewer?.followingUsers || [];
  const likedVideos = viewer?.likedVideos || [];
  const savedVideos = viewer?.savedVideos || [];

  let score = 0;
  const reasons = [];
  const engagement = scoreVideo(row) + Number(row.views || 0) * 0.5;
  const freshness = Math.max(0, 35 - daysSince(row.created_at));

  score += engagement * 0.08;
  score += freshness;

  if (followingUsers.includes(row.user)) {
    score += 55;
    reasons.push("criador que você segue");
  }

  if (interests.creators.has(row.user)) {
    score += 36 * interests.creators.get(row.user);
    reasons.push("parecido com criadores que você curtiu");
  }

  const matchedTags = tags.filter((tag) => interests.tags.has(tag));
  if (matchedTags.length) {
    score += matchedTags.reduce((sum, tag) => sum + interests.tags.get(tag) * 22, 0);
    reasons.push(`hashtags parecidas: ${matchedTags.slice(0, 2).map((tag) => `#${tag}`).join(", ")}`);
  }

  if (Number(row.views || 0) > 0) {
    score += Number(row.views || 0) * 0.15;
    reasons.push("vídeo sendo assistido");
  }

  if (Number(row.gifts || 0) > 0) {
    score += Number(row.gifts || 0) * 0.6;
    reasons.push("vídeo recebendo presentes");
  }

  if (likedVideos.includes(Number(row.id)) || savedVideos.includes(Number(row.id))) {
    score -= 90;
    reasons.push("você já interagiu");
  }

  if (viewer?.user === row.user) score -= 120;
  if (!reasons.length) reasons.push("alta tendência no GXST Vibes");

  return { score, reasons };
}

export function registerFeedRoutes(app, getAuthUser) {
  if (!extraRoutesRegistered) {
    registerModerationRoutes(app, getAuthUser);
    registerMonetizationRoutes(app, getAuthUser);
    registerPaymentRoutes(app, getAuthUser);
    registerAnalyticsRoutes(app, getAuthUser);
    registerViewRoutes(app, getAuthUser);
    registerLiveCommentRoutes(app, getAuthUser);
    extraRoutesRegistered = true;
  }

  app.get("/api/feed/recommended", (req, res) => {
    const viewer = getAuthUser(req);
    const rows = sqlite.prepare("SELECT * FROM videos").all();
    const ids = [...(viewer?.likedVideos || []), ...(viewer?.savedVideos || [])].map(Number);
    const interests = buildInterestMap(rows, ids);

    const ranked = rows
      .map((row) => {
        const rankedItem = algorithmScore(row, viewer, interests);
        return {
          ...rowToVideo(row, viewer),
          views: Number(row.views || 0),
          algorithmScore: Math.round(rankedItem.score),
          reason: rankedItem.reasons[0],
          reasons: rankedItem.reasons
        };
      })
      .sort((a, b) => b.algorithmScore - a.algorithmScore)
      .slice(0, 30);

    res.json({
      mode: viewer ? "personalizado" : "tendências",
      total: ranked.length,
      videos: ranked
    });
  });
}
