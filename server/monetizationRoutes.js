import { getUserById, publicUser, sqlite } from "./sqliteStore.js";

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

function initMonetizationStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payout_requests (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      pix_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by INTEGER,
      note TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

function creatorStats(userId) {
  const row = sqlite.prepare(`
    SELECT
      COUNT(*) AS videos,
      COALESCE(SUM(likes), 0) AS likes,
      COALESCE(SUM(comments), 0) AS comments,
      COALESCE(SUM(shares), 0) AS shares,
      COALESCE(SUM(gifts), 0) AS gifts
    FROM videos
    WHERE user_id = ?
  `).get(userId);

  const pending = sqlite.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payout_requests WHERE user_id = ? AND status = 'pending'").get(userId).total;
  const paid = sqlite.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payout_requests WHERE user_id = ? AND status = 'approved'").get(userId).total;
  const totalEarned = Math.floor(Number(row.gifts || 0) * 0.5);
  const available = Math.max(0, totalEarned - Number(pending || 0) - Number(paid || 0));

  return {
    videos: Number(row.videos || 0),
    likes: Number(row.likes || 0),
    comments: Number(row.comments || 0),
    shares: Number(row.shares || 0),
    gifts: Number(row.gifts || 0),
    totalEarned,
    pending: Number(pending || 0),
    paid: Number(paid || 0),
    available
  };
}

function payoutPayload(row) {
  const user = getUserById(row.user_id);
  return {
    id: row.id,
    user: publicUser(user),
    amount: Number(row.amount || 0),
    pixKey: row.pix_key,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    note: row.note
  };
}

export function registerMonetizationRoutes(app, getAuthUser) {
  initMonetizationStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/creator/wallet", requireAuth, (req, res) => {
    const stats = creatorStats(req.user.id);
    const payouts = sqlite.prepare("SELECT * FROM payout_requests WHERE user_id = ? ORDER BY id DESC LIMIT 30").all(req.user.id).map(payoutPayload);
    res.json({ user: publicUser(req.user), stats, payouts });
  });

  app.post("/api/creator/payouts", requireAuth, (req, res) => {
    const amount = Math.max(1, Number(req.body.amount || 0));
    const pixKey = String(req.body.pixKey || "").trim();
    const stats = creatorStats(req.user.id);

    if (!pixKey) return res.status(400).json({ error: "Informe uma chave PIX para solicitar saque." });
    if (amount < 10) return res.status(400).json({ error: "Valor mínimo para saque fake é 10 moedas." });
    if (amount > stats.available) return res.status(400).json({ error: "Saldo disponível insuficiente para esse saque." });

    const result = sqlite.prepare(`
      INSERT INTO payout_requests (user_id, amount, pix_key, created_at)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, amount, pixKey, new Date().toISOString());

    const row = sqlite.prepare("SELECT * FROM payout_requests WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json(payoutPayload(row));
  });

  app.get("/api/admin/payouts", requireAuth, requireAdmin, (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM payout_requests ORDER BY id DESC LIMIT 100").all();
    res.json(rows.map(payoutPayload));
  });

  app.post("/api/admin/payouts/:id/status", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body.status || "approved");
    const note = String(req.body.note || "").trim();
    const allowed = ["pending", "approved", "rejected"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });

    const row = sqlite.prepare("SELECT * FROM payout_requests WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Pedido de saque não encontrado." });

    sqlite.prepare("UPDATE payout_requests SET status = ?, note = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?").run(status, note, new Date().toISOString(), req.user.id, id);
    const updated = sqlite.prepare("SELECT * FROM payout_requests WHERE id = ?").get(id);
    res.json(payoutPayload(updated));
  });
}
