import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { initSqlite, rowToVideo, scoreVideo, sqlite } from "./sqliteStore.js";
import { getAuthUser, registerAuthRoutes, requireAuth } from "./auth.js";
import { registerProfileRoutes } from "./profileRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const ROOT_DIR = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const DIST_DIR = path.join(ROOT_DIR, "dist");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

const sampleVideos = [
  "https://videos.pexels.com/video-files/853789/853789-hd_720_1280_25fps.mp4",
  "https://videos.pexels.com/video-files/2792370/2792370-hd_720_1280_30fps.mp4",
  "https://videos.pexels.com/video-files/3571264/3571264-hd_720_1280_30fps.mp4"
];

initSqlite(bcrypt.hashSync("123456", 10), sampleVideos);

const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 200 * 1024 * 1024 } });

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "GXST Vibes", version: "V5 SQLite", database: "SQLite" });
});

registerAuthRoutes(app);
registerProfileRoutes(app);

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

app.post("/api/videos", requireAuth, upload.single("video"), (req, res) => {
  const caption = String(req.body.caption || "").trim();
  if (!caption) return res.status(400).json({ error: "Legenda é obrigatória." });

  const filename = req.file?.filename || "";
  const videoUrl = filename ? `/uploads/${filename}` : String(req.body.videoUrl || "").trim() || sampleVideos[0];
  const tags = JSON.stringify(["gxst", "vibes"]);
  const result = sqlite.prepare(`
    INSERT INTO videos (user_id, user, name, avatar, video_url, caption, music, tags, likes, comments, shares, gifts, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?)
  `).run(req.user.id, req.user.user, req.user.name, req.user.avatar, videoUrl, caption, String(req.body.music || "Som original"), tags, new Date().toISOString());

  const row = sqlite.prepare("SELECT * FROM videos WHERE id = ?").get(Number(result.lastInsertRowid));
  res.status(201).json(rowToVideo(row, req.user));
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => console.log(`GXST Vibes V5 SQLite em http://localhost:${PORT}`));
