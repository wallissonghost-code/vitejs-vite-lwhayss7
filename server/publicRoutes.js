import { getUserByUsername, publicUser, rowToVideo, sqlite } from "./sqliteStore.js";
import { getAuthUser, requireAuth } from "./auth.js";

function profileFromVideo(username) {
  const row = sqlite.prepare("SELECT * FROM videos WHERE user = ? ORDER BY id DESC LIMIT 1").get(username);
  if (!row) return null;
  return {
    id: row.user_id || 0,
    user: row.user,
    name: row.name,
    bio: "Perfil público do GXST Vibes.",
    avatar: row.avatar,
    coins: 0,
    followers: 0,
    followingUsers: [],
    likedVideos: [],
    savedVideos: []
  };
}

function publicProfilePayload(username, viewer = null) {
  const cleanUser = String(username || "").replace("@", "").trim().toLowerCase();
  const user = getUserByUsername(cleanUser) || profileFromVideo(cleanUser);
  if (!user) return null;

  const videos = sqlite.prepare("SELECT * FROM videos WHERE user = ? ORDER BY id DESC").all(cleanUser);
  const likes = videos.reduce((sum, video) => sum + Number(video.likes || 0), 0);
  const gifts = videos.reduce((sum, video) => sum + Number(video.gifts || 0), 0);
  const following = Boolean(viewer?.followingUsers?.includes(cleanUser));

  return {
    profile: publicUser(user),
    stats: {
      videos: videos.length,
      likes,
      gifts,
      points: likes + gifts,
      followers: user.followers || 0,
      following
    },
    videos: videos.map((row) => rowToVideo(row, viewer))
  };
}

export function registerPublicRoutes(app) {
  app.get("/api/public/profile/:user", (req, res) => {
    const viewer = getAuthUser(req);
    const payload = publicProfilePayload(req.params.user, viewer);
    if (!payload) return res.status(404).json({ error: "Perfil não encontrado." });
    res.json(payload);
  });

  app.post("/api/public/profile/:user/follow", requireAuth, (req, res) => {
    const targetUser = String(req.params.user || "").replace("@", "").trim().toLowerCase();
    if (!targetUser) return res.status(400).json({ error: "Usuário inválido." });
    if (targetUser === req.user.user) return res.status(400).json({ error: "Você não pode seguir você mesmo." });

    const target = getUserByUsername(targetUser);
    if (!target && !profileFromVideo(targetUser)) return res.status(404).json({ error: "Perfil não encontrado." });

    const following = req.user.followingUsers || [];
    const alreadyFollowing = following.includes(targetUser);
    const nextFollowing = alreadyFollowing ? following.filter((item) => item !== targetUser) : [...following, targetUser];
    sqlite.prepare("UPDATE users SET following_users = ? WHERE id = ?").run(JSON.stringify(nextFollowing), req.user.id);

    if (target) {
      const followers = Math.max(0, Number(target.followers || 0) + (alreadyFollowing ? -1 : 1));
      sqlite.prepare("UPDATE users SET followers = ? WHERE id = ?").run(followers, target.id);
    }

    const viewer = getUserByUsername(req.user.user);
    const payload = publicProfilePayload(targetUser, viewer);
    res.json(payload);
  });
}
