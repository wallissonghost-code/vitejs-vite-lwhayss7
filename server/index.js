import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeUser(value = "") {
  return String(value)
    .replace("@", "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored = "") {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(key, "hex"));
}

function createSeedUser() {
  return {
    id: 1,
    user: "ghost",
    name: "Ghost Admin",
    bio: "Conta demo do GXST Vibes. Senha inicial: 123456.",
    avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=ghost-admin",
    coins: 500,
    followers: 1500,
    followingUsers: ["modelo.fx"],
    likedVideos: [],
    savedVideos: [],
    passwordHash: hashPassword("123456"),
    createdAt: new Date().toISOString()
  };
}

function createInitialDb() {
  return {
    users: [createSeedUser()],
    sessions: [],
    videos: [
      {
        id: 1,
        userId: null,
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
        userId: null,
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
        userId: null,
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
}

function migrateDb(data) {
  const initial = createInitialDb();
  const users = Array.isArray(data.users) ? data.users : initial.users;
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const videos = Array.isArray(data.videos) ? data.videos : initial.videos;

  return {
    users: users.map((user) => ({
      ...user,
      followingUsers: Array.isArray(user.followingUsers) ? user.followingUsers : [],
      likedVideos: Array.isArray(user.likedVideos) ? user.likedVideos : [],
      savedVideos: Array.isArray(user.savedVideos) ? user.savedVideos : [],
      coins: Number(user.coins || 0),
      followers: Number(user.followers || 0)
    })),
    sessions,
    videos: videos.map((video) => ({
      ...video,
      userId: video.userId ?? null,
      likes: Number(video.likes || 0),
      comments: Number(video.comments || 0),
      shares: Number(video.shares || 0),
      gifts: Number(video.gifts || 0),
      following: Boolean(video.following),
      commentList: Array.isArray(video.commentList) ? video.commentList : []
    }))
  };
}

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    writeDb(initial);
    return clone(initial);
  }

  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    const migrated = migrateDb(data);
    writeDb(migrated);
    return migrated;
  } catch {
    const initial = createInitialDb();
    writeDb(initial);
    return clone(initial);
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    user: user.user,
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    coins: Number(user.coins || 0),
    followers: Number(user.followers || 0),
    followingUsers: Array.isArray(user.followingUsers) ? user.followingUsers : [],
    likedVideos: Array.isArray(user.likedVideos) ? user.likedVideos : [],
    savedVideos: Array.isArray(user.savedVideos) ? user.savedVideos : []
  };
}

function publicVideo(video, viewer = null) {
  const commentList = Array.isArray(video.commentList) ? video.commentList : [];
  const followingUsers = viewer?.followingUsers || [];
  return {
    ...video,
    comments: Number(video.comments || 0),
    following: followingUsers.includes(video.user),
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

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions = db.sessions.filter((session) => session.userId !== userId);
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  return token;
}

function getAuthUser(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function requireAuth(req, res, next) {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: "Faça login para continuar." });
  req.db = db;
  req.user = user;
  next();
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
  res.json({ ok: true, app: "GXST Vibes", version: "V4 Auth", port: PORT });
});

app.post("/api/auth/register", (req, res) => {
  const db = readDb();
  const userName = normalizeUser(req.body.user);
  const name = String(req.body.name || "").trim();
  const password = String(req.body.password || "");

  if (!userName || userName.length < 3) return res.status(400).json({ error: "Usuário precisa ter pelo menos 3 caracteres." });
  if (!name) return res.status(400).json({ error: "Informe seu nome." });
  if (password.length < 6) return res.status(400).json({ error: "Senha precisa ter pelo menos 6 caracteres." });
  if (db.users.some((user) => user.user === userName)) return res.status(409).json({ error: "Esse usuário já existe." });

  const user = {
    id: Date.now(),
    user: userName,
    name,
    bio: "Novo creator do GXST Vibes.",
    avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(userName)}`,
    coins: 250,
    followers: 0,
    followingUsers: [],
    likedVideos: [],
    savedVideos: [],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  const token = createSession(db, user.id);
  writeDb(db);
  res.status(201).json({ token, user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const db = readDb();
  const userName = normalizeUser(req.body.user);
  const password = String(req.body.password || "");
  const user = db.users.find((item) => item.user === userName);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  const token = createSession(db, user.id);
  writeDb(db);
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  req.db.sessions = req.db.sessions.filter((session) => session.token !== token);
  writeDb(req.db);
  res.json({ ok: true });
});

app.get("/api/profile", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

app.put("/api/profile", requireAuth, (req, res) => {
  const cleanUser = normalizeUser(req.body.user || req.user.user);
  if (!cleanUser || cleanUser.length < 3) return res.status(400).json({ error: "Usuário inválido." });

  const userConflict = req.db.users.some((user) => user.id !== req.user.id && user.user === cleanUser);
  if (userConflict) return res.status(409).json({ error: "Esse usuário já está em uso." });

  const oldUser = req.user.user;
  req.user.user = cleanUser;
  req.user.name = String(req.body.name || req.user.name || "Meu Perfil").trim();
  req.user.bio = String(req.body.bio || req.user.bio || "").trim();
  req.user.avatar = `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`;

  req.db.videos = req.db.videos.map((video) =>
    video.userId === req.user.id
      ? { ...video, user: cleanUser, name: req.user.name, avatar: req.user.avatar }
      : video
  );

  req.db.users = req.db.users.map((user) => {
    const followingUsers = (user.followingUsers || []).map((item) => (item === oldUser ? cleanUser : item));
    return { ...user, followingUsers };
  });

  writeDb(req.db);
  res.json(publicUser(req.user));
});

app.post("/api/wallet/recharge", requireAuth, (req, res) => {
  const amount = Number(req.body.amount || 100);
  req.user.coins = Number(req.user.coins || 0) + Math.max(1, amount);
  writeDb(req.db);
  res.json(publicUser(req.user));
});

app.get("/api/videos", (req, res) => {
  const db = readDb();
  const viewer = getAuthUser(req, db);
  res.json(db.videos.map((video) => publicVideo(video, viewer)));
});

app.get("/api/ranking", (req, res) => {
  const db = readDb();
  const viewer = getAuthUser(req, db);
  const ranking = [...db.videos].sort((a, b) => scoreVideo(b) - scoreVideo(a)).slice(0, 10);
  res.json(ranking.map((video) => publicVideo(video, viewer)));
});

app.post("/api/videos", requireAuth, upload.single("video"), (req, res) => {
  const caption = String(req.body.caption || "").trim();
  if (!caption) return res.status(400).json({ error: "Legenda é obrigatória." });

  const uploadedUrl = req.file ? `/uploads/${req.file.filename}` : "";
  const videoUrl = uploadedUrl || String(req.body.videoUrl || "").trim() || sampleVideos[Math.floor(Math.random() * sampleVideos.length)];

  const video = {
    id: Date.now(),
    userId: req.user.id,
    user: req.user.user,
    name: req.user.name,
    avatar: req.user.avatar,
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

  req.db.videos.unshift(video);
  writeDb(req.db);
  res.status(201).json(publicVideo(video, req.user));
});

app.post("/api/videos/:id/like", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const video = req.db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });

  const likedVideos = req.user.likedVideos || [];
  const alreadyLiked = likedVideos.includes(id);
  if (alreadyLiked) {
    req.user.likedVideos = likedVideos.filter((item) => item !== id);
    video.likes = Math.max(0, Number(video.likes || 0) - 1);
  } else {
    req.user.likedVideos = [...likedVideos, id];
    video.likes = Number(video.likes || 0) + 1;
  }

  writeDb(req.db);
  res.json({ video: publicVideo(video, req.user), user: publicUser(req.user), liked: !alreadyLiked });
});

app.post("/api/videos/:id/save", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const video = req.db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });

  const savedVideos = req.user.savedVideos || [];
  const alreadySaved = savedVideos.includes(id);
  req.user.savedVideos = alreadySaved ? savedVideos.filter((item) => item !== id) : [...savedVideos, id];
  writeDb(req.db);
  res.json({ video: publicVideo(video, req.user), user: publicUser(req.user), saved: !alreadySaved });
});

app.post("/api/videos/:id/follow", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const video = req.db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (video.user === req.user.user) return res.status(400).json({ error: "Você não pode seguir você mesmo." });

  const followingUsers = req.user.followingUsers || [];
  const alreadyFollowing = followingUsers.includes(video.user);
  req.user.followingUsers = alreadyFollowing
    ? followingUsers.filter((item) => item !== video.user)
    : [...followingUsers, video.user];

  const creator = req.db.users.find((user) => user.user === video.user);
  if (creator) creator.followers = Math.max(0, Number(creator.followers || 0) + (alreadyFollowing ? -1 : 1));

  writeDb(req.db);
  res.json({ video: publicVideo(video, req.user), user: publicUser(req.user), following: !alreadyFollowing });
});

app.post("/api/videos/:id/share", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const video = req.db.videos.find((item) => Number(item.id) === id);
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  video.shares = Number(video.shares || 0) + 1;
  writeDb(req.db);
  res.json(publicVideo(video, req.user));
});

app.post("/api/videos/:id/comments", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const video = req.db.videos.find((item) => Number(item.id) === id);
  const text = String(req.body.text || "").trim();
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (!text) return res.status(400).json({ error: "Comentário vazio." });

  const comment = {
    id: Date.now(),
    user: req.user.user,
    name: req.user.name,
    avatar: req.user.avatar,
    text,
    createdAt: new Date().toISOString()
  };

  video.commentList = [comment, ...(video.commentList || [])];
  video.comments = Number(video.comments || 0) + 1;
  writeDb(req.db);
  res.status(201).json({ video: publicVideo(video, req.user), comment });
});

app.post("/api/videos/:id/gift", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const video = req.db.videos.find((item) => Number(item.id) === id);
  const gift = gifts[req.body.giftId] || gifts.rose;
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado." });
  if (Number(req.user.coins || 0) < gift.coins) return res.status(400).json({ error: "Moedas insuficientes." });

  req.user.coins = Number(req.user.coins || 0) - gift.coins;
  video.gifts = Number(video.gifts || 0) + gift.coins;
  video.likes = Number(video.likes || 0) + 1;

  const creator = req.db.users.find((user) => user.user === video.user);
  if (creator) creator.coins = Number(creator.coins || 0) + Math.floor(gift.coins * 0.5);

  writeDb(req.db);
  res.json({ user: publicUser(req.user), video: publicVideo(video, req.user), gift });
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
