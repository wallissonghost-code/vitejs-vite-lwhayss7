import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "gxst.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const sqlite = new Database(DB_FILE);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export function toJson(value) {
  return JSON.stringify(value ?? []);
}

export function fromJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeUser(value = "") {
  return String(value)
    .replace("@", "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export function initSqlite(seedHash, sampleVideos) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      user TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL,
      coins INTEGER NOT NULL DEFAULT 250,
      followers INTEGER NOT NULL DEFAULT 0,
      following_users TEXT NOT NULL DEFAULT '[]',
      liked_videos TEXT NOT NULL DEFAULT '[]',
      saved_videos TEXT NOT NULL DEFAULT '[]',
      credential_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      user TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      video_url TEXT NOT NULL,
      caption TEXT NOT NULL,
      music TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      likes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0,
      gifts INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      video_id INTEGER NOT NULL,
      user_id INTEGER,
      user TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const userCount = sqlite.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  if (userCount === 0) {
    sqlite.prepare(`
      INSERT INTO users (id, user, name, bio, avatar, coins, followers, following_users, liked_videos, saved_videos, credential_hash, created_at)
      VALUES (@id, @user, @name, @bio, @avatar, @coins, @followers, @following_users, @liked_videos, @saved_videos, @credential_hash, @created_at)
    `).run({
      id: 1,
      user: "ghost",
      name: "Ghost Admin",
      bio: "Conta demo do GXST Vibes. Senha inicial: 123456.",
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=ghost-admin",
      coins: 500,
      followers: 1500,
      following_users: toJson(["modelo.fx"]),
      liked_videos: toJson([]),
      saved_videos: toJson([]),
      credential_hash: seedHash,
      created_at: new Date().toISOString()
    });
  }

  const videoCount = sqlite.prepare("SELECT COUNT(*) AS total FROM videos").get().total;
  if (videoCount === 0) {
    const now = new Date().toISOString();
    const insert = sqlite.prepare(`
      INSERT INTO videos (id, user_id, user, name, avatar, video_url, caption, music, tags, likes, comments, shares, gifts, verified, created_at)
      VALUES (@id, @user_id, @user, @name, @avatar, @video_url, @caption, @music, @tags, @likes, @comments, @shares, @gifts, @verified, @created_at)
    `);

    [
      {
        id: 1,
        user_id: null,
        user: "gxst.vibes",
        name: "GXST Vibes Oficial",
        avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=gxst",
        video_url: sampleVideos[0],
        caption: "Bem-vindo ao GXST Vibes: vídeos curtos, trends, ranking e criadores em destaque. #gxst #viral",
        music: "Som original - GXST Vibes",
        tags: toJson(["gxst", "viral", "shorts"]),
        likes: 12890,
        comments: 342,
        shares: 118,
        gifts: 740,
        verified: 1,
        created_at: now
      },
      {
        id: 2,
        user_id: null,
        user: "modelo.fx",
        name: "Modelo FX",
        avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=modelofx",
        video_url: sampleVideos[1],
        caption: "Ensaio premium com estética urbana para capa digital. #modelo #fx",
        music: "Trend premium - FX Studio",
        tags: toJson(["modelo", "fx", "capa"]),
        likes: 8420,
        comments: 219,
        shares: 77,
        gifts: 320,
        verified: 0,
        created_at: now
      },
      {
        id: 3,
        user_id: null,
        user: "ghost.creator",
        name: "Ghost Creator",
        avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=ghostcreator",
        video_url: sampleVideos[2],
        caption: "Criador em destaque da semana. Poste, cresça e entre no ranking. #creator #ranking",
        music: "Beat exclusivo - Ghost",
        tags: toJson(["creator", "ranking", "vibes"]),
        likes: 3960,
        comments: 144,
        shares: 61,
        gifts: 190,
        verified: 1,
        created_at: now
      }
    ].forEach((video) => insert.run(video));
  }
}

export function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    user: row.user,
    name: row.name,
    bio: row.bio,
    avatar: row.avatar,
    coins: Number(row.coins || 0),
    followers: Number(row.followers || 0),
    followingUsers: fromJson(row.following_users, []),
    likedVideos: fromJson(row.liked_videos, []),
    savedVideos: fromJson(row.saved_videos, []),
    credentialHash: row.credential_hash,
    createdAt: row.created_at
  };
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    user: user.user,
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    coins: Number(user.coins || 0),
    followers: Number(user.followers || 0),
    followingUsers: user.followingUsers || [],
    likedVideos: user.likedVideos || [],
    savedVideos: user.savedVideos || []
  };
}

export function getUserById(id) {
  return rowToUser(sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

export function getUserByUsername(username) {
  return rowToUser(sqlite.prepare("SELECT * FROM users WHERE user = ?").get(username));
}

export function commentsForVideo(videoId) {
  return sqlite.prepare("SELECT * FROM comments WHERE video_id = ? ORDER BY id DESC").all(videoId).map((comment) => ({
    id: comment.id,
    user: comment.user,
    name: comment.name,
    avatar: comment.avatar,
    text: comment.text,
    createdAt: comment.created_at
  }));
}

export function rowToVideo(row, viewer = null) {
  if (!row) return null;
  const followingUsers = viewer?.followingUsers || [];
  return {
    id: row.id,
    userId: row.user_id,
    user: row.user,
    name: row.name,
    avatar: row.avatar,
    videoUrl: row.video_url,
    caption: row.caption,
    music: row.music,
    tags: fromJson(row.tags, []),
    likes: Number(row.likes || 0),
    comments: Number(row.comments || 0),
    shares: Number(row.shares || 0),
    gifts: Number(row.gifts || 0),
    verified: Boolean(row.verified),
    following: followingUsers.includes(row.user),
    commentList: commentsForVideo(row.id)
  };
}

export function scoreVideo(row) {
  return Number(row.likes || 0) + Number(row.comments || 0) * 2 + Number(row.shares || 0) * 4 + Number(row.gifts || 0) * 5;
}

export function extractTags(text = "") {
  const found = text.match(/#[a-zA-Z0-9_À-ÿ]+/g) || [];
  const tags = found.map((tag) => tag.replace("#", "").toLowerCase());
  return tags.length ? tags.slice(0, 4) : ["gxst", "vibes"];
}
