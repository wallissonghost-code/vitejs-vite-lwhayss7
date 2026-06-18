import { useEffect, useState } from "react";
import { BadgeCheck, Coins, CreditCard, RefreshCw, ShoppingBag, Sparkles, X } from "lucide-react";

type CoinPackage = {
  id: string;
  title: string;
  coins: number;
  price: number;
  highlight: boolean;
};

type VipPlan = {
  id: string;
  title: string;
  days: number;
  price: number;
  perks: string[];
};

type Payment = {
  id: number;
  productId: string;
  productType: string;
  amount: number;
  coins: number;
  status: string;
  gateway: string;
  qrCode: string;
  createdAt: string;
  paidAt?: string | null;
  user?: { user: string; name: string } | null;
};

type ProductsResponse = {
  coinPackages: CoinPackage[];
  vipPlans: VipPlan[];
  gateway: string;
};

type CurrentUser = {
  user: string;
};

const TOKEN_KEY = "gxst-token";

async function shopRequest<T>(url: string, token = "", options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro na loja.");
  return data as T;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ShopPanel() {
  const [token, setToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [vipPlans, setVipPlans] = useState<VipPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminPayments, setAdminPayments] = useState<Payment[]>([]);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadShop() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    try {
      const products = await shopRequest<ProductsResponse>("/api/shop/products");
      setCoinPackages(products.coinPackages);
      setVipPlans(products.vipPlans);

      if (savedToken) {
        const me = await shopRequest<CurrentUser>("/api/auth/me", savedToken);
        setIsAdmin(me.user === "ghost");
        const myPayments = await shopRequest<Payment[]>("/api/shop/payments", savedToken);
        setPayments(myPayments);
        if (me.user === "ghost") {
          const allPayments = await shopRequest<Payment[]>("/api/admin/payments", savedToken);
          setAdminPayments(allPayments);
        }
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar loja.");
    }
  }

  async function checkout(productId: string) {
    if (!token) {
      alert("Faça login para comprar.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      const payment = await shopRequest<Payment>("/api/shop/checkout", token, {
        method: "POST",
        body: JSON.stringify({ productId })
      });
      setActivePayment(payment);
      await loadShop();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao iniciar pagamento.");
    }
  }

  async function simulatePaid(paymentId: number) {
    if (!token) return;
    try {
      const result = await shopRequest<{ payment: Payment }>(`/api/shop/payments/${paymentId}/simulate-paid`, token, { method: "POST" });
      setActivePayment(result.payment);
      setSuccess("Pagamento fake confirmado. Benefício liberado.");
      await loadShop();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao confirmar pagamento.");
    }
  }

  useEffect(() => {
    loadShop();
    const timer = window.setInterval(loadShop, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <button className="shop-float-button" onClick={() => { setOpen(true); loadShop(); }}>
        <ShoppingBag size={18} />
        Loja
      </button>

      {open && (
        <div className="shop-backdrop">
          <section className="shop-card">
            <div className="shop-header">
              <div>
                <span className="eyebrow">GXST Pay</span>
                <h2>Loja</h2>
                <p>Moedas, VIP e pagamento PIX fake.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar loja"><X /></button>
            </div>

            <div className="shop-actions">
              <button onClick={loadShop}><RefreshCw size={16} /> Atualizar</button>
              <button><CreditCard size={16} /> PIX fake</button>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="shop-success"><BadgeCheck size={16} /> {success}</div>}

            {activePayment && (
              <section className="shop-payment-box">
                <h3>Pagamento #{activePayment.id}</h3>
                <strong>{money(activePayment.amount)}</strong>
                <small>Status: {activePayment.status}</small>
                <code>{activePayment.qrCode}</code>
                {activePayment.status !== "paid" && <button onClick={() => simulatePaid(activePayment.id)}>Simular pagamento aprovado</button>}
              </section>
            )}

            <section className="shop-section">
              <h3>Comprar moedas</h3>
              <div className="shop-product-grid">
                {coinPackages.map((item) => (
                  <button className={item.highlight ? "shop-product highlight" : "shop-product"} key={item.id} onClick={() => checkout(item.id)}>
                    <Coins size={19} />
                    <strong>{item.title}</strong>
                    <span>{money(item.price)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="shop-section">
              <h3>Planos VIP</h3>
              {vipPlans.map((plan) => (
                <button className="vip-plan" key={plan.id} onClick={() => checkout(plan.id)}>
                  <Sparkles size={19} />
                  <div>
                    <strong>{plan.title}</strong>
                    <small>{plan.days} dias • {money(plan.price)}</small>
                    <em>{plan.perks.join(" • ")}</em>
                  </div>
                </button>
              ))}
            </section>

            <section className="shop-section">
              <h3>Meus pagamentos</h3>
              {payments.length === 0 && <p className="shop-empty">Nenhum pagamento ainda.</p>}
              {payments.map((payment) => <PaymentRow payment={payment} key={payment.id} onClick={() => setActivePayment(payment)} />)}
            </section>

            {isAdmin && (
              <section className="shop-section">
                <h3>Admin pagamentos</h3>
                {adminPayments.map((payment) => <PaymentRow payment={payment} key={payment.id} admin onClick={() => setActivePayment(payment)} />)}
              </section>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function PaymentRow({ payment, admin = false, onClick }: { payment: Payment; admin?: boolean; onClick: () => void }) {
  return (
    <button className="payment-row" onClick={onClick}>
      <div>
        <strong>#{payment.id} • {payment.productId}</strong>
        <small>{admin && payment.user ? `@${payment.user.user} • ` : ""}{money(payment.amount)} • {payment.status}</small>
      </div>
    </button>
  );
}
