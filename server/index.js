import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const DIST_DIR = path.join(ROOT_DIR, "dist");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

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

const initialDb = {
  profile: {
    user: "meu.perfil",
    name: "Meu Perfil",
    bio: "Creator GXST Vibes • vídeos curtos, trends, capas e divulgação.",
    avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=wallissonghost",
    coins: 250,
    followers: 1500
  },
  videos: [
    {
      id: 1,
      user: "gxst.vibes",
      name: "GXST Vibes Oficial",
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=gxst",
      videoUrl: sampleVideos[0],
      caption: "Bem-vindo ao GXST Vibes: vídeos curtos, trends, ranking e criadores em destaque. #gxst #viral",
      music: "Som original - GXST Vibes",
      tags: ["gxst", "viral", "shorts"],
      likes: 12890,
      comments: 342,
      shares: 118,
      gifts: 740,
      verified: true,
      following: false,
      commentList: []
    },
    {
      id: 2,
      user: "modelo.fx",
      name: "Modelo FX",
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=modelofx",
      videoUrl: sampleVideos[1],
      caption: "Ensaio premium com estética urbana para capa digital. #modelo #fx",
      music: "Trend premium - FX Studio",
      tags: ["modelo", "fx", "capa"],
      likes: 8420,
      comments: 219,
      shares: 77,
      gifts: 320,
      verified: false,
      following: true,
      commentList: []
    },
    {
      id: 3,
      user: "ghost.creator",
      name: "Ghost Creator",
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=ghostcreator",
      videoUrl: sampleVideos[2],
      caption: "Criador em destaque da semana. Poste, cresça e entre no ranking. #creator #ranking",
      music: "Beat exclusivo - Ghost",
      tags: ["creator", "ranking", "vibes"],
      likes: 3960,
      comments: 144,
      shares: 61,
      gifts: 190,
      verified: true,
      following: false,
      commentList: []
    }
  ]
};

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    writeDb(initialDb);
    return structuredClone(initialDb);
  }

  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      profile: data.profile || initialDb.profile,
      videos: Array.isArray(data.videos) ? data.videos : initialDb.videos
    };
  } catch {
    writeDb(initialDb);
    return structuredClone(initialDb);
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function publicVideo(video) {
  const commentList = Array.isArray(video.commentList) ? video.commentList : [];
  return {
    ...video,
    comments: Number(video.comments || 0),
    commentList
  };
}

function scoreVideo(video) {
  return Number(video.likes || 0) + Number(video.comments || 0) * 2 + Number(video.shares || 0) * 4 + Number(video.gifts || 0) * 5;
}

function extractTags(text = "") {
  const found = text.match(/#[a-zA-Z0-9_À-ÿ]+/g) || [];
  const tags = found.map((tag) => tag.replace("#", "").toLowerCase());
  return tags.length ? tags.slice(0, 4) : ["gxst", "vibes"];
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Envie apenas arquivos de vídeo."));
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "GXST Vibes", port: PORT });
});

app.get("/api/profile", (_req, res) => {
  const db = readDb();
  res.json(db.profile);
});

app.put("/api/profile", (req, res) => {
  const db = readDb();
  const cleanUser = String(req.body.user || db.profile.user || "meu.perfil").replace("@", "").trim();
  db.profile = {
    ...db.profile,
    name: String(req.body.name || db.profile.name || "Meu Perfil").trim(),
    user: cleanUser || "meu.perfil",
    bio: String(req.body.bio || db.profile.bio || "").trim(),
    avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(cleanUser || "meu.perfil")}`
  };
  writeDb(db);
  res.json(db.profile);
});

app.post("/api/wallet/recharge", (req, res) => {
  const amount = Number(req.body.amount || 100);
  const db = readDb();
  db.profile.coins = Number(db.profile.coins || 0) + Math.max(1, amount);
  writeDb(db);
  res.json(db.profile);
});

app.get("/api/videos", (_req, res) => {
  const db = readDb();
  res.json(db.videos.map(publicVideo));
});

app.get("/api/ranking", (_req, res) => {
  const db = readDb();
  const ranking = [...db.videos].sort((a, b) => scoreVideo(b) - scoreVideo(a)).slice(0, 10);
  res.json(ranking.map(publicVideo));
});

app.post("/api/videos", upload.single("video"), (req, res) => {
  const db = readDb();
  const caption = String(req.body.caption || "").trim();
  if (!caption) return res.status(400).json({ error: "Legenda é obrigatória." });

  const user = String(req.body.user || db.profile.user || "meu.perfil").replace("@", "").trim();
  const name = String(req.body.creator || db.profile.name || "Meu Perfil").trim();
  const uploadedUrl = req.file ? `/uploads/${req.file.filename}` : "";
  const videoUrl = uploadedUrl || String(req.body.videoUrl || "").trim() || sampleVideos[Math.floor(Math.random() * sampleVideos.length)];

  const video = {
    id: Date.now(),
    user,
    name,
    avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(user)}`,
    videoUrl,
    caption,
    music: String(req.body.music || "Som original - Meu Perfil").trim(),
    tags: extractTags(caption),
    likes: 0,
    comments: 0,
    shares: 0,
    gifts: 0,
    verified: false,
    following: false,
    commentList: []
  };

  db.videos.unshift(video);
  writeDb(db);
  res.status(201).json(publicVideo(video));
});

app.post("/api/videos/:id/like", (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const video = db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  const amount = req.body.liked ? 1 : -1;
  video.likes = Math.max(0, Number(video.likes || 0) + amount);
  writeDb(db);
  res.json(publicVideo(video));
});

app.post("/api/videos/:id/follow", (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const video = db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  video.following = !video.following;
  writeDb(db);
  res.json(publicVideo(video));
});

app.post("/api/videos/:id/share", (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const video = db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  video.shares = Number(video.shares || 0) + 1;
  writeDb(db);
  res.json(publicVideo(video));
});

app.post("/api/videos/:id/comments", (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const video = db.videos.find((item) => Number(item.id) === id);
  const text = String(req.body.text || "").trim();
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (!text) return res.status(400).json({ error: "Comentário vazio." });

  const comment = {
    id: Date.now(),
    user: db.profile.user,
    name: db.profile.name,
    avatar: db.profile.avatar,
    text,
    createdAt: new Date().toISOString()
  };

  video.commentList = [comment, ...(video.commentList || [])];
  video.comments = Number(video.comments || 0) + 1;
  writeDb(db);
  res.status(201).json({ video: publicVideo(video), comment });
});

app.post("/api/videos/:id/gift", (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const video = db.videos.find((item) => Number(item.id) === id);
  const gift = gifts[req.body.giftId] || gifts.rose;
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (Number(db.profile.coins || 0) < gift.coins) {
    return res.status(400).json({ error: "Moedas insuficientes." });
  }

  db.profile.coins = Number(db.profile.coins || 0) - gift.coins;
  video.gifts = Number(video.gifts || 0) + gift.coins;
  video.likes = Number(video.likes || 0) + 1;
  writeDb(db);
  res.json({ profile: db.profile, video: publicVideo(video), gift });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`GXST Vibes API rodando em http://localhost:${PORT}`);
});
