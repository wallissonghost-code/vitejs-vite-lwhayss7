import { useEffect, useState } from "react";
import { Crown, RefreshCw, Star, X } from "lucide-react";

type Plan = { id: string; title: string; days: number; coins: number; perks: string[] };
type Creator = { id: number; user: string; name: string; stats?: { videos: number; subscribers: number } };
type Subscription = { id: number; status: string; currentPeriodEnd: string; plan: Plan; creator?: Creator | null; subscriber?: Creator | null };

const TOKEN_KEY = "gxst-token";

async function request<T>(url: string, token = "", options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro em assinaturas.");
  return data as T;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("pt-BR");
}

export function SubscriptionsPanel() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [mine, setMine] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<Subscription[]>([]);
  const [planId, setPlanId] = useState("fan");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    try {
      const planData = await request<{ plans: Plan[] }>("/api/subscriptions/plans");
      const creatorData = await request<Creator[]>("/api/subscriptions/creators");
      setPlans(planData.plans);
      setCreators(creatorData);
      if (savedToken) {
        setMine(await request<Subscription[]>("/api/subscriptions/me", savedToken));
        setMembers(await request<Subscription[]>("/api/subscriptions/members", savedToken));
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar assinaturas.");
    }
  }

  async function subscribe(username: string) {
    if (!token) return alert("Faça login para assinar.");
    try {
      const data = await request<{ subscription: Subscription }>(`/api/subscriptions/creators/${username}/subscribe`, token, {
        method: "POST",
        body: JSON.stringify({ planId })
      });
      setSuccess(`Assinatura ativada até ${dateLabel(data.subscription.currentPeriodEnd)}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao assinar.");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 12000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <button className="shop-float-button" style={{ top: 372 }} onClick={() => { setOpen(true); load(); }}>
        <Crown size={18} /> Assinar
      </button>
      {open && (
        <div className="shop-backdrop">
          <section className="shop-card">
            <div className="shop-header">
              <div>
                <span className="eyebrow">Creator Club</span>
                <h2>Assinaturas</h2>
                <p>Assine criadores usando moedas.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar"><X /></button>
            </div>
            <div className="shop-actions">
              <button onClick={load}><RefreshCw size={16} /> Atualizar</button>
              <button><Star size={16} /> {members.length} membros</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="shop-success">{success}</div>}

            <section className="shop-section">
              <h3>Planos</h3>
              {plans.map((plan) => (
                <button className="vip-plan" key={plan.id} onClick={() => setPlanId(plan.id)}>
                  <Star size={18} />
                  <div>
                    <strong>{plan.title}{planId === plan.id ? " • selecionado" : ""}</strong>
                    <small>{plan.coins} moedas • {plan.days} dias</small>
                    <em>{plan.perks.join(" • ")}</em>
                  </div>
                </button>
              ))}
            </section>

            <section className="shop-section">
              <h3>Criadores</h3>
              {creators.map((creator) => (
                <button className="payment-row" key={creator.id} onClick={() => subscribe(creator.user)}>
                  <div>
                    <strong>@{creator.user} • {creator.name}</strong>
                    <small>{creator.stats?.videos || 0} vídeos • {creator.stats?.subscribers || 0} assinantes</small>
                  </div>
                </button>
              ))}
            </section>

            <section className="shop-section">
              <h3>Minhas assinaturas</h3>
              {mine.length === 0 && <p className="shop-empty">Nenhuma assinatura ativa.</p>}
              {mine.map((sub) => (
                <div className="payment-row" key={sub.id}>
                  <div>
                    <strong>@{sub.creator?.user} • {sub.plan.title}</strong>
                    <small>{sub.status} • até {dateLabel(sub.currentPeriodEnd)}</small>
                  </div>
                </div>
              ))}
            </section>
          </section>
        </div>
      )}
    </>
  );
}
