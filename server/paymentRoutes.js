import { randomUUID } from "node:crypto";
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

function mercadoPagoToken() {
  return String(process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "").trim();
}

function mercadoPagoReady() {
  return Boolean(mercadoPagoToken());
}

function paymentGateway() {
  const configured = String(process.env.PAYMENT_GATEWAY || "").trim().toLowerCase();
  if (configured) return configured;
  return mercadoPagoReady() ? "mercado_pago_pix" : "fake_pix";
}

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

  [
    "ALTER TABLE payments ADD COLUMN external_id TEXT",
    "ALTER TABLE payments ADD COLUMN qr_code_base64 TEXT",
    "ALTER TABLE payments ADD COLUMN ticket_url TEXT",
    "ALTER TABLE payments ADD COLUMN last_synced_at TEXT"
  ].forEach((sql) => {
    try {
      sqlite.prepare(sql).run();
    } catch {
      // column already exists
    }
  });

  try {
    sqlite.prepare("ALTER TABLE users ADD COLUMN vip_until TEXT").run();
  } catch {
    // column already exists
  }
}

function fromJson(value, fallback = {}) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
}

function productById(productId) {
  return coinPackages.find((item) => item.id === productId) || vipPlans.find((item) => item.id === productId) || null;
}

function paymentPayload(row) {
  const user = getUserById(row.user_id);
  const metadata = fromJson(row.metadata, {});
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
    externalId: row.external_id || "",
    qrCode: row.qr_code,
    qrCodeBase64: row.qr_code_base64 || "",
    ticketUrl: row.ticket_url || "",
    mercadoPagoStatus: metadata.mercadoPago?.status || "",
    createdAt: row.created_at,
    paidAt: row.paid_at,
    lastSyncedAt: row.last_synced_at || ""
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

function payerEmail(req) {
  const fromBody = String(req.body?.payerEmail || "").trim();
  if (fromBody.includes("@")) return fromBody;
  const fallback = String(process.env.MERCADO_PAGO_DEFAULT_PAYER_EMAIL || process.env.DEFAULT_PAYER_EMAIL || "comprador@gxstvibes.local").trim();
  return fallback.includes("@") ? fallback : "comprador@gxstvibes.local";
}

async function createMercadoPagoPix({ req, product, productId, paymentId, amountCents }) {
  const token = mercadoPagoToken();
  if (!token) throw new Error("Configure MERCADO_PAGO_ACCESS_TOKEN para usar Pix real.");

  const apiBase = String(process.env.MERCADO_PAGO_API_BASE || "https://api.mercadopago.com").replace(/\/$/, "");
  const amount = Number((amountCents / 100).toFixed(2));
  const idempotencyKey = `gxst-${paymentId}-${randomUUID()}`;
  const body = {
    transaction_amount: amount,
    description: `${product.title} - GXST Vibes`,
    payment_method_id: "pix",
    external_reference: `gxst-payment-${paymentId}`,
    notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL || undefined,
    payer: {
      email: payerEmail(req),
      first_name: req.user.name || req.user.user
    },
    metadata: {
      gxst_payment_id: paymentId,
      product_id: productId,
      user_id: req.user.id
    }
  };

  const response = await fetch(`${apiBase}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Mercado Pago retornou erro ${response.status}.`);
  }

  const transactionData = data?.point_of_interaction?.transaction_data || {};
  return {
    externalId: String(data.id || ""),
    status: String(data.status || "pending"),
    qrCode: transactionData.qr_code || "",
    qrCodeBase64: transactionData.qr_code_base64 || "",
    ticketUrl: transactionData.ticket_url || data?.transaction_details?.external_resource_url || "",
    raw: data
  };
}

function mapMercadoPagoStatus(status) {
  if (status === "approved" || status === "accredited") return "paid";
  if (["cancelled", "rejected", "refunded", "charged_back"].includes(status)) return "failed";
  return "pending";
}

async function fetchMercadoPagoPayment(externalId) {
  const token = mercadoPagoToken();
  if (!token) throw new Error("Configure MERCADO_PAGO_ACCESS_TOKEN para consultar Pix real.");
  const apiBase = String(process.env.MERCADO_PAGO_API_BASE || "https://api.mercadopago.com").replace(/\/$/, "");
  const response = await fetch(`${apiBase}/v1/payments/${encodeURIComponent(externalId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || `Mercado Pago retornou erro ${response.status}.`);
  return data;
}

async function syncMercadoPagoPayment(payment) {
  if (!payment?.external_id) return payment;
  const data = await fetchMercadoPagoPayment(payment.external_id);
  const nextStatus = mapMercadoPagoStatus(String(data.status || "pending"));
  const metadata = fromJson(payment.metadata, {});
  const nextMetadata = JSON.stringify({ ...metadata, mercadoPago: data });
  const paidAt = nextStatus === "paid" ? (data.date_approved || new Date().toISOString()) : payment.paid_at;

  if (nextStatus === "paid" && payment.status !== "paid") applyPaymentBenefits(payment);

  sqlite.prepare(`
    UPDATE payments
    SET status = ?, paid_at = ?, last_synced_at = ?, metadata = ?
    WHERE id = ?
  `).run(nextStatus, paidAt || null, new Date().toISOString(), nextMetadata, payment.id);

  return sqlite.prepare("SELECT * FROM payments WHERE id = ?").get(payment.id);
}

export function registerPaymentRoutes(app, getAuthUser) {
  initPaymentStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.get("/api/shop/products", (_req, res) => {
    res.json({ coinPackages, vipPlans, gateway: paymentGateway(), mercadoPagoReady: mercadoPagoReady() });
  });

  app.post("/api/shop/checkout", requireAuth, async (req, res) => {
    const productId = String(req.body.productId || "").trim();
    const product = productById(productId);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    const productType = productId.startsWith("vip") ? "vip" : "coins";
    const amountCents = Math.round(product.price * 100);
    const coins = product.coins || 0;
    const createdAt = new Date().toISOString();
    const requestedGateway = String(req.body.gateway || paymentGateway()).trim();
    const gateway = requestedGateway === "mercado_pago_pix" && mercadoPagoReady() ? "mercado_pago_pix" : "fake_pix";

    const result = sqlite.prepare(`
      INSERT INTO payments (user_id, product_id, product_type, amount_cents, coins, status, gateway, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(req.user.id, productId, productType, amountCents, coins, gateway, createdAt, JSON.stringify({ product }));

    const paymentId = Number(result.lastInsertRowid);

    if (gateway === "mercado_pago_pix") {
      try {
        const mp = await createMercadoPagoPix({ req, product, productId, paymentId, amountCents });
        sqlite.prepare(`
          UPDATE payments
          SET external_id = ?, qr_code = ?, qr_code_base64 = ?, ticket_url = ?, metadata = ?
          WHERE id = ?
        `).run(mp.externalId, mp.qrCode, mp.qrCodeBase64, mp.ticketUrl, JSON.stringify({ product, mercadoPago: mp.raw }), paymentId);
      } catch (error) {
        sqlite.prepare("UPDATE payments SET status = 'failed', metadata = ? WHERE id = ?").run(JSON.stringify({ product, error: error.message }), paymentId);
        return res.status(400).json({ error: error.message, fallback: "fake_pix_disponivel" });
      }
    } else {
      const qrCode = fakePixCode({ user: req.user, product, paymentId });
      sqlite.prepare("UPDATE payments SET qr_code = ? WHERE id = ?").run(qrCode, paymentId);
    }

    const row = sqlite.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId);
    res.status(201).json(paymentPayload(row));
  });

  app.post("/api/shop/payments/:id/simulate-paid", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const payment = sqlite.prepare("SELECT * FROM payments WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });
    if (payment.gateway !== "fake_pix") return res.status(400).json({ error: "Pagamento real não pode ser simulado. Use sincronizar status." });
    applyPaymentBenefits(payment);
    sqlite.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    const updated = sqlite.prepare("SELECT * FROM payments WHERE id = ?").get(id);
    res.json({ payment: paymentPayload(updated), user: publicUser(getUserById(req.user.id)) });
  });

  app.post("/api/shop/payments/:id/sync", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const payment = sqlite.prepare("SELECT * FROM payments WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!payment) return res.status(404).json({ error: "Pagamento não encontrado." });
    if (payment.gateway !== "mercado_pago_pix") return res.status(400).json({ error: "Esse pagamento não usa Mercado Pago." });
    try {
      const synced = await syncMercadoPagoPayment(payment);
      res.json({ payment: paymentPayload(synced), user: publicUser(getUserById(req.user.id)) });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/shop/payments", requireAuth, (req, res) => {
    const rows = sqlite.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(req.user.id);
    res.json(rows.map(paymentPayload));
  });

  app.post("/api/shop/mercadopago/webhook", async (req, res) => {
    const externalId = String(req.body?.data?.id || req.body?.id || req.query?.id || "").trim();
    if (externalId) {
      const payment = sqlite.prepare("SELECT * FROM payments WHERE external_id = ? LIMIT 1").get(externalId);
      if (payment) await syncMercadoPagoPayment(payment).catch(() => null);
    }
    res.json({ ok: true });
  });

  app.get("/api/admin/payments", requireAuth, requireAdmin, (_req, res) => {
    const rows = sqlite.prepare("SELECT * FROM payments ORDER BY id DESC LIMIT 100").all();
    res.json(rows.map(paymentPayload));
  });
}
