import fs from "node:fs";
import path from "node:path";
import { getUserByUsername, sqlite } from "./sqliteStore.js";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanUsername(value = "") {
  return String(value).replace("@", "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
}

function siteBaseUrl(req) {
  const configured = String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${process.env.PORT || 3001}`;
  return `${proto}://${host}`;
}

function creatorFromVideos(username) {
  const row = sqlite.prepare("SELECT * FROM videos WHERE user = ? ORDER BY id DESC LIMIT 1").get(username);
  if (!row) return null;
  return {
    user: row.user,
    name: row.name,
    bio: "Criador no GXST Vibes.",
    avatar: row.avatar
  };
}

function creatorStats(username) {
  const row = sqlite.prepare(`
    SELECT COUNT(*) AS videos, COALESCE(SUM(likes), 0) AS likes, COALESCE(SUM(gifts), 0) AS gifts
    FROM videos
    WHERE user = ?
  `).get(username);
  return {
    videos: Number(row?.videos || 0),
    likes: Number(row?.likes || 0),
    gifts: Number(row?.gifts || 0)
  };
}

function creatorMeta(username) {
  const user = getUserByUsername(username) || creatorFromVideos(username);
  if (!user) return null;
  const stats = creatorStats(username);
  const title = `${user.name || `@${username}`} (@${username}) no GXST Vibes`;
  const description = `${user.bio || "Perfil público do criador no GXST Vibes."} ${stats.videos} vídeos, ${stats.likes} curtidas e ${stats.gifts} presentes.`.trim();
  return {
    title,
    description,
    image: user.avatar || "",
    username,
    stats
  };
}

function injectMeta(html, meta, url) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const safeUrl = escapeHtml(url);
  const tags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${safeUrl}" />
    ${image ? `<meta property="og:image" content="${image}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${image}" />` : ""}
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: meta.title,
      alternateName: `@${meta.username}`,
      url,
      image: meta.image || undefined,
      description: meta.description
    }).replace(/</g, "\\u003c")}</script>
  `;

  return html
    .replace(/<title>.*?<\/title>/i, "")
    .replace("</head>", `${tags}\n  </head>`);
}

export function registerSeoRoutes(app, distDir) {
  app.get("/@:username", (req, res, next) => {
    const indexPath = path.join(distDir, "index.html");
    if (!fs.existsSync(indexPath)) return next();

    const username = cleanUsername(req.params.username);
    const meta = creatorMeta(username);
    if (!meta) return next();

    const html = fs.readFileSync(indexPath, "utf8");
    const url = `${siteBaseUrl(req)}/@${username}`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(injectMeta(html, meta, url));
  });
}
