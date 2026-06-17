import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import {
  commentsForVideo,
  getUserById,
  getUserByUsername,
  initSqlite,
  normalizeUser,
  publicUser,
  rowToVideo,
  scoreVideo,
  sqlite,
  toJson
} from "./sqliteStore.js";
import { getAuthUser, registerAuthRoutes, requireAuth } from "./auth.js";
import { createStorageProvider } from "./storageProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const isProduction = process.env.NODE_ENV === "production";
const storage = createStorageProvider(ROOT_DIR);

if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin }));
app.use(express.json({ limit: process.env.JSON_LIMIT || "10mb" }));

if (storage.config.uploadsDir) {
  app.use("/uploads", express.static(storage.config.uploadsDir, { maxAge: isProduction ? "7d" : 0 }));
}

const sampleVideos = [
  "https://videos.pexels.com/video-files/853789/853789-hd_720_1280_25fps.mp4",
  "https://videos.pexels.com/video-files/2792370/2792370-hd_720_1280_30fps.mp4",
  "https://videos.pexels.com/video-files/3571264/3571264-hd_720_1280_30fps.mp4"
];

const gifts = {
  rose: { name: "Rosa", coins: 5 },
  fire: { name: "Fogo", coins: 15 },
  crown: { name: "Coroa", coins: 50 },
  diamond: { name: "Diamante", coins: 100 }
};

function tagsFromCaption(caption) {
  const found = caption.match(/#[a-zA-Z0-9_À-ÿ]+/g) || ["#gxst", "#vibes"];
  return toJson(found.map((tag) => tag.replace("#", "").toLowerCase()));
}

initSqlite(bcrypt.hashSync("123456", 10), sampleVideos);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "GXST Vibes",
    version: "V13 Supabase Storage Ready",
    database: "SQLite",
    storage: storage.config,
    production: isProduction
  });
});

registerAuthRoutes(app);

app.get("/api/profile", requireAuth, (req, res) => res.json(publicUser(req.user)));

app.put("/api/profile", requireAuth, (req, res) => {
  const cleanUser = normalizeUser(req.body.user || req.user.user);
  const name = String(req.body.name || req.user.name || "Meu Perfil").trim();
  const bio = String(req.body.bio || req.user.bio || "").trim();
  if (!cleanUser || cleanUser.length < 3) return res.status(400).json({ error: "Usuário inválido." });
  const conflict = sqlite.prepare("SELECT id FROM users WHERE user = ? AND id != ?").get(cleanUser, req.user.id);
  if (conflict) return res.status(409).json({ error: "Esse usuário já está em uso." });
  const avatar = `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`;
  sqlite.prepare("UPDATE users SET user = ?, name = ?, bio = ?, avatar = ? WHERE id = ?").run(cleanUser, name, bio, avatar, req.user.id);
  sqlite.prepare("UPDATE videos SET user = ?, name = ?, avatar = ? WHERE user_id = ?").run(cleanUser, name, avatar, req.user.id);
  sqlite.prepare("UPDATE comments SET user = ?, name = ?, avatar = ? WHERE user_id = ?").run(cleanUser, name, avatar, req.user.id);
  res.json(publicUser(getUserById(req.user.id)));
});

app.post("/api/wallet/recharge", requireAuth, (req, res) => {
  const coins = Number(req.user.coins || 0) + Math.max(1, Number(req.body.amount || 100));
  sqlite.prepare("UPDATE users SET coins = ? WHERE id = ?").run(coins, req.user.id);
  res.json(publicUser(getUserById(req.user.id)));
});

app.get("/api/videos", (req, res) => {
  const viewer = getAuthUser(req);
  const rows = sqlite.prepare("SELECT * FROM videos ORDER BY id DESC").all();
  res.json(rows.map((row) => rowToVideo(row, viewer)));
});

app.get("/api/ranking", (req, res) => {
  const viewer = getAuthUser(req);
  const rows = sqlite.prepare("SELECT * FROM videos").all().sort((a, b) => scoreVideo(b) - scoreVideo(a)).slice(0, 10);
  res.json(rows.map((row) => rowToVideo(row, viewer)));
});

app.post("/api/videos", requireAuth, storage.upload.single("video"), async (req, res, next) => {
  try {
    const caption = String(req.body.caption || "").trim();
    if (!caption) return res.status(400).json({ error: "Legenda é obrigatória." });
    const uploadedUrl = await storage.saveFile(req.file);
    const videoUrl = uploadedUrl || String(req.body.videoUrl || "").trim() || sampleVideos[0];
    const result = sqlite.prepare(`
      INSERT INTO videos (user_id, user, name, avatar, video_url, caption, music, tags, likes, comments, shares, gifts, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?)
    `).run(req.user.id, req.user.user, req.user.name, req.user.avatar, videoUrl, caption, String(req.body.music || "Som original"), tagsFromCaption(caption), new Date().toISOString());
    const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json(rowToVideo(row, req.user));
  } catch (err) {
    next(err);
  }
});

app.post("/api/videos/:id/like", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
  const liked = req.user.likedVideos || [];
  const has = liked.includes(id);
  const next = has ? liked.filter((item) => item !== id) : [...liked, id];
  sqlite.prepare("UPDATE users SET liked_videos = ? WHERE id = ?").run(toJson(next), req.user.id);
  sqlite.prepare("UPDATE videos SET likes = ? WHERE id = ?").run(Math.max(0, Number(row.likes || 0) + (has ? -1 : 1)), id);
  const user = getUserById(req.user.id);
  const video = rowToVideo(sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id), user);
  res.json({ video, user: publicUser(user), liked: !has });
});

app.post("/api/videos/:id/save", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
  const saved = req.user.savedVideos || [];
  const has = saved.includes(id);
  const next = has ? saved.filter((item) => item !== id) : [...saved, id];
  sqlite.prepare("UPDATE users SET saved_videos = ? WHERE id = ?").run(toJson(next), req.user.id);
  const user = getUserById(req.user.id);
  res.json({ video: rowToVideo(row, user), user: publicUser(user), saved: !has });
});

app.post("/api/videos/:id/follow", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (row.user === req.user.user) return res.status(400).json({ error: "Você não pode seguir você mesmo." });
  const following = req.user.followingUsers || [];
  const has = following.includes(row.user);
  const next = has ? following.filter((item) => item !== row.user) : [...following, row.user];
  sqlite.prepare("UPDATE users SET following_users = ? WHERE id = ?").run(toJson(next), req.user.id);
  const creator = getUserByUsername(row.user);
  if (creator) sqlite.prepare("UPDATE users SET followers = ? WHERE id = ?").run(Math.max(0, creator.followers + (has ? -1 : 1)), creator.id);
  const user = getUserById(req.user.id);
  res.json({ video: rowToVideo(row, user), user: publicUser(user), following: !has });
});

app.post("/api/videos/:id/share", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
  sqlite.prepare("UPDATE videos SET shares = shares + 1 WHERE id = ?").run(id);
  res.json(rowToVideo(sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id), req.user));
});

app.post("/api/videos/:id/comments", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  const text = String(req.body.text || "").trim();
  if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (!text) return res.status(400).json({ error: "Comentário vazio." });
  const result = sqlite.prepare(`
    INSERT INTO comments (video_id, user_id, user, name, avatar, text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, req.user.user, req.user.name, req.user.avatar, text, new Date().toISOString());
  sqlite.prepare("UPDATE videos SET comments = comments + 1 WHERE id = ?").run(id);
  const video = rowToVideo(sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id), req.user);
  const comment = commentsForVideo(id).find((item) => item.id === Number(result.lastInsertRowid));
  res.status(201).json({ video, comment });
});

app.post("/api/videos/:id/gift", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  const gift = gifts[req.body.giftId] || gifts.rose;
  if (!row) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (Number(req.user.coins || 0) < gift.coins) return res.status(400).json({ error: "Moedas insuficientes." });
  sqlite.prepare("UPDATE users SET coins = ? WHERE id = ?").run(Number(req.user.coins || 0) - gift.coins, req.user.id);
  sqlite.prepare("UPDATE videos SET gifts = gifts + ?, likes = likes + 1 WHERE id = ?").run(gift.coins, id);
  const creator = getUserByUsername(row.user);
  if (creator && creator.id !== req.user.id) sqlite.prepare("UPDATE users SET coins = ? WHERE id = ?").run(creator.coins + Math.floor(gift.coins * 0.5), creator.id);
  const user = getUserById(req.user.id);
  const video = rowToVideo(sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(id), user);
  res.json({ user: publicUser(user), video, gift });
});

app.use((err, _req, res, _next) => {
  const message = err?.message || "Erro interno no servidor.";
  const status = message.includes("arquivo") || message.includes("vídeo") || message.includes("Supabase") ? 400 : 500;
  res.status(status).json({ error: message });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { maxAge: isProduction ? "1h" : 0 }));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => console.log(`GXST Vibes V13 em http://localhost:${PORT}`));
