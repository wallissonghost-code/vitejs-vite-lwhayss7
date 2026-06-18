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

const coinPackages = [
  { id: "coins_100", title: "100 Moedas", coins: 100, price: 4.99, highlight: false },
  { id: "coins_500", title: "500 Moedas", coins: 500, price: 19.99, highlight: true },
  { id: "coins_1200", title: "1200 Moedas", coins: 1200, price: 39.99, highlight: false }
];

const vipPlans = [
  { id: "vip_monthly", title: "VIP Mensal", days: 30, price: 14.99, perks: ["Selo VIP", "Bônus de 250 moedas", "Destaque no perfil"] },
  { id: "vip_quarter", title: "VIP 3 Meses", days: 90, price: 34.99, perks: ["Selo VIP", "Bônus de 750 moedas", "Mais destaque no Feed IA"] }
];

function initPaymentStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      coins INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      gateway TEXT NOT NULL DEFAULT 'fake_pix',
      qr_code TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      paid_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    sqlite.prepare("ALTER TABLE users ADD COLUMN vip_until TEXT").run();
  } catch {
    // column already exists
  }
}

function productById(productId) {
  return coinPackages.find((item) => item.id === productId) || vipPlans.find((item) => item.id === productId) || null;
}

function paymentPayload(row) {
  const user = getUserById(row.user_id);
  return {
    id: row.id,
    user: publicUser(user),
    productId: row.product_id,
    productType: row.product_type,
    amountCents: Number(row.amount_cents || 0),
    amount: Number(row.amount_cents || 0) / 100,
    coins: Number(row.coins || 0),
    status: row.status,
    gateway: row.gateway,
    qrCode: row.qr_code,
    createdAt: row.created_at,
    paidAt: row.paid_at
  };
}

function fakePixCode({ user, product, paymentId }) {
  return `GXST-PIX-FAKE|pedido=${paymentId}|user=${user.user}|produto=${product.id}|valor=${product.price}`;
}

function applyPaymentBenefits(payment) {
  if (payment.status === "paid") return;
  const user = getUserById(payment.user_id);
  const product = productById(payment.product_id);
  if (!user || !product) return;

  if (payment.product_type === "coins") {
    sqlite.prepare("UPDATE users SET coins = coins + ? WHERE id = ?").run(product.coins, user.id);
  }

  if (payment.product_type === "vip") {
    const currentBase = user.vipUntil && new Date(user.vipUntil).getTime() > Date.now() ? new Date(user.vipUntil) : new Date();
    currentBase.setDate(currentBase.getDate() + product.days);
    const bonusCoins = product.id === "vip_quarter" ? 750 : 250;
    sqlite.prepare("UPDATE users SET coins = coins + ?, vip_until = ? WHERE id = ?").run(bonusCoins, currentBase.toISOString(), user.id);
  }
}

export function registerPaymentRoutes(app, getAuthUser) {
  initPaymentStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/shop/products", (_req, res) => {
    res.json({ coinPackages, vipPlans, gateway: "fake_pix" });
  });

  app.post("/api/shop/checkout", requireAuth, (req, res) => {
    const productId = String(req.body.productId || "").trim();
    const product = productById(productId);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    const productType = productId.startsWith("vip") ? "vip" : "coins";
    const amountCents = Math.round(product.price * 100);
    const coins = product.coins || 0;
    const createdAt = new Date().toISOString();

    const result = sqlite.prepare(`
      INSERT INTO payments (user_id, product_id, product_type, amount_cents, coins, status, gateway, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, 'pending', 'fake_pix', ?, ?)
    `).run(req.user.id, productId, productType, amountCents, coins, createdAt, JSON.stringify(product));

    const paymentId = Number(result.lastInsertRowid);
    const qrCode = fakePixCode({ user: req.user, product, paymentId });
    sqlite.prepare("UPDATE payments SET qr_code = ? WHERE id = ?").run(qrCode, paymentId);
    const row = sqlite.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId);
    res.status(201).json(paymentPayload(row));
  });

  app.post("/api/shop/payments/:id/simulate-paid", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const payment = sqlite.prepare("SELECT * FROM payments WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });
    applyPaymentBenefits(payment);
    sqlite.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    const updated = sqlite.prepare("SELECT * FROM payments WHERE id = ?").get(id);
    res.json({ payment: paymentPayload(updated), user: publicUser(getUserById(req.user.id)) });
  });

  app.get("/api/shop/payments", requireAuth, (req, res) => {
    const rows = sqlite.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(req.user.id);
    res.json(rows.map(paymentPayload));
  });

  app.get("/api/admin/payments", requireAuth, requireAdmin, (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM payments ORDER BY id DESC LIMIT 100").all();
    res.json(rows.map(paymentPayload));
  });
}
