import { getUserById, getUserByUsername, publicUser, sqlite } from "./sqliteStore.js";

function makeRequireAuth(getAuthUser) {
  return function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Faça login para usar assinaturas." });
    req.user = user;
    next();
  };
}

const subscriptionPlans = [
  { id: "fan", title: "Fã", days: 30, coins: 50, perks: ["Selo de apoiador", "Acesso à área de assinante", "Prioridade no chat"] },
  { id: "premium", title: "Premium", days: 30, coins: 150, perks: ["Tudo do Fã", "Destaque nos comentários", "Bônus para o criador"] },
  { id: "vip_creator", title: "VIP Criador", days: 30, coins: 300, perks: ["Tudo do Premium", "Badge VIP", "Maior apoio ao criador"] }
];

function initSubscriptionStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS creator_subscriptions (
      id INTEGER PRIMARY KEY,
      subscriber_user_id INTEGER NOT NULL,
      creator_user_id INTEGER NOT NULL,
      plan_id TEXT NOT NULL,
      amount_coins INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      current_period_end TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (subscriber_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_creator_subscriber ON creator_subscriptions(subscriber_user_id);
    CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_creator ON creator_subscriptions(creator_user_id);
    CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_status ON creator_subscriptions(status);
  `);
}

function planById(planId) {
  return subscriptionPlans.find((plan) => plan.id === planId) || subscriptionPlans[0];
}

function cleanUsername(value) {
  return String(value || "").replace("@", "").trim().toLowerCase();
}

function subscriptionStatus(row) {
  if (!row) return "inactive";
  if (row.status !== "active") return row.status;
  return new Date(row.current_period_end).getTime() > Date.now() ? "active" : "expired";
}

function subscriptionPayload(row) {
  const creator = getUserById(row.creator_user_id);
  const subscriber = getUserById(row.subscriber_user_id);
  return {
    id: row.id,
    plan: planById(row.plan_id),
    planId: row.plan_id,
    amountCoins: Number(row.amount_coins || 0),
    status: subscriptionStatus(row),
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creator: creator ? publicUser(creator) : null,
    subscriber: subscriber ? publicUser(subscriber) : null
  };
}

function creatorStats(userId, username) {
  const videos = sqlite.prepare("SELECT COUNT(*) AS total FROM videos WHERE user_id = ? OR user = ?").get(userId, username).total;
  const subs = sqlite.prepare("SELECT COUNT(*) AS total FROM creator_subscriptions WHERE creator_user_id = ? AND status = 'active' AND current_period_end > ?").get(userId, new Date().toISOString()).total;
  return { videos: Number(videos || 0), subscribers: Number(subs || 0) };
}

function ensureVideoCreators() {
  const rows = sqlite.prepare("SELECT user, name, avatar FROM videos GROUP BY user ORDER BY id DESC LIMIT 30").all();
  rows.forEach((row) => {
    const username = cleanUsername(row.user);
    if (!username || getUserByUsername(username)) return;
    const name = row.name || username;
    const avatar = row.avatar || `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    try {
      sqlite.prepare(`
        INSERT INTO users (user, name, bio, avatar, coins, followers, following_users, liked_videos, saved_videos, password_hash, created_at)
        VALUES (?, ?, ?, ?, 0, 0, '[]', '[]', '[]', '', ?)
      `).run(username, name, "Criador de exemplo do GXST Vibes.", avatar, new Date().toISOString());
      const created = getUserByUsername(username);
      if (created) sqlite.prepare("UPDATE videos SET user_id = ? WHERE user = ?").run(created.id, username);
    } catch {
      // ignore seed creator conflicts
    }
  });
}

function creatorList() {
  ensureVideoCreators();
  const rows = sqlite.prepare(`
    SELECT users.*
    FROM users
    WHERE EXISTS (SELECT 1 FROM videos WHERE videos.user_id = users.id OR videos.user = users.user)
    ORDER BY followers DESC, id DESC
    LIMIT 50
  `).all();

  return rows.map((row) => ({
    ...publicUser({
      id: row.id,
      user: row.user,
      name: row.name,
      bio: row.bio,
      avatar: row.avatar,
      coins: row.coins,
      followers: row.followers,
      followingUsers: [],
      likedVideos: [],
      savedVideos: []
    }),
    stats: creatorStats(row.id, row.user)
  }));
}

function activeSubscription(subscriberId, creatorId) {
  return sqlite.prepare(`
    SELECT * FROM creator_subscriptions
    WHERE subscriber_user_id = ? AND creator_user_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(subscriberId, creatorId);
}

function notifySubscription({ creatorId, subscriber }) {
  try {
    sqlite.prepare(`
      INSERT INTO notifications (recipient_user_id, actor_user_id, actor_user, type, video_id, message, created_at)
      VALUES (?, ?, ?, 'subscription', NULL, ?, ?)
    `).run(creatorId, subscriber.id, subscriber.user, `@${subscriber.user} assinou seu perfil.`, new Date().toISOString());
  } catch {
    // notifications table may not be ready
  }
}

export function registerSubscriptionRoutes(app, getAuthUser) {
  initSubscriptionStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/subscriptions/plans", (_req, res) => {
    res.json({ plans: subscriptionPlans });
  });

  app.get("/api/subscriptions/creators", (_req, res) => {
    res.json(creatorList());
  });

  app.get("/api/subscriptions/me", requireAuth, (req, res) => {
    const rows = sqlite.prepare("SELECT * FROM creator_subscriptions WHERE subscriber_user_id = ? ORDER BY id DESC LIMIT 50").all(req.user.id);
    res.json(rows.map(subscriptionPayload));
  });

  app.get("/api/subscriptions/members", requireAuth, (req, res) => {
    const rows = sqlite.prepare("SELECT * FROM creator_subscriptions WHERE creator_user_id = ? ORDER BY id DESC LIMIT 100").all(req.user.id);
    res.json(rows.map(subscriptionPayload));
  });

  app.post("/api/subscriptions/creators/:username/subscribe", requireAuth, (req, res) => {
    ensureVideoCreators();
    const creator = getUserByUsername(cleanUsername(req.params.username));
    if (!creator) return res.status(404).json({ error: "Criador não encontrado." });
    if (creator.id === req.user.id) return res.status(400).json({ error: "Você não pode assinar você mesmo." });

    const plan = planById(String(req.body.planId || "fan"));
    const user = getUserById(req.user.id);
    if (Number(user.coins || 0) < plan.coins) return res.status(400).json({ error: "Moedas insuficientes para assinar." });

    const now = new Date();
    const existing = activeSubscription(user.id, creator.id);
    const base = existing && new Date(existing.current_period_end).getTime() > now.getTime() ? new Date(existing.current_period_end) : now;
    base.setDate(base.getDate() + plan.days);

    sqlite.prepare("UPDATE users SET coins = coins - ? WHERE id = ?").run(plan.coins, user.id);
    sqlite.prepare("UPDATE users SET coins = coins + ? WHERE id = ?").run(Math.floor(plan.coins * 0.7), creator.id);

    let row;
    if (existing) {
      sqlite.prepare(`
        UPDATE creator_subscriptions
        SET plan_id = ?, amount_coins = ?, status = 'active', current_period_end = ?, updated_at = ?
        WHERE id = ?
      `).run(plan.id, plan.coins, base.toISOString(), now.toISOString(), existing.id);
      row = sqlite.prepare("SELECT * FROM creator_subscriptions WHERE id = ?").get(existing.id);
    } else {
      const result = sqlite.prepare(`
        INSERT INTO creator_subscriptions (subscriber_user_id, creator_user_id, plan_id, amount_coins, status, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(user.id, creator.id, plan.id, plan.coins, base.toISOString(), now.toISOString(), now.toISOString());
      row = sqlite.prepare("SELECT * FROM creator_subscriptions WHERE id = ?").get(Number(result.lastInsertRowid));
    }

    notifySubscription({ creatorId: creator.id, subscriber: user });
    res.status(201).json({ subscription: subscriptionPayload(row), user: publicUser(getUserById(user.id)) });
  });

  app.post("/api/subscriptions/:id/cancel", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const row = sqlite.prepare("SELECT * FROM creator_subscriptions WHERE id = ? AND subscriber_user_id = ?").get(id, req.user.id);
    if (!row) return res.status(404).json({ error: "Assinatura não encontrada." });
    sqlite.prepare("UPDATE creator_subscriptions SET status = 'cancelled', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    const updated = sqlite.prepare("SELECT * FROM creator_subscriptions WHERE id = ?").get(id);
    res.json(subscriptionPayload(updated));
  });
}
