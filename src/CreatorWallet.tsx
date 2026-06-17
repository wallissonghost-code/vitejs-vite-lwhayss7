import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Coins, RefreshCw, Wallet, X } from "lucide-react";

type WalletStats = {
  videos: number;
  likes: number;
  comments: number;
  shares: number;
  gifts: number;
  totalEarned: number;
  pending: number;
  paid: number;
  available: number;
};

type Payout = {
  id: number;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  note: string;
  user?: { user: string; name: string } | null;
};

type WalletResponse = {
  stats: WalletStats;
  payouts: Payout[];
};

type CurrentUser = {
  user: string;
};

const TOKEN_KEY = "gxst-token";

async function walletRequest<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro na carteira.");
  return data as T;
}

export function CreatorWallet() {
  const [token, setToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [adminPayouts, setAdminPayouts] = useState<Payout[]>([]);
  const [amount, setAmount] = useState(10);
  const [pixKey, setPixKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadWallet() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    if (!savedToken) return;

    try {
      const [me, wallet] = await Promise.all([
        walletRequest<CurrentUser>("/api/auth/me", savedToken),
        walletRequest<WalletResponse>("/api/creator/wallet", savedToken)
      ]);
      setIsAdmin(me.user === "ghost");
      setStats(wallet.stats);
      setPayouts(wallet.payouts);
      if (me.user === "ghost") {
        const allPayouts = await walletRequest<Payout[]>("/api/admin/payouts", savedToken);
        setAdminPayouts(allPayouts);
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar carteira.");
    }
  }

  async function requestPayout() {
    if (!token) return;
    setError("");
    setSuccess("");
    try {
      await walletRequest("/api/creator/payouts", token, {
        method: "POST",
        body: JSON.stringify({ amount, pixKey })
      });
      setSuccess("Pedido de saque enviado para análise.");
      setPixKey("");
      await loadWallet();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao pedir saque.");
    }
  }

  async function updatePayout(id: number, status: string) {
    if (!token) return;
    try {
      await walletRequest(`/api/admin/payouts/${id}/status`, token, {
        method: "POST",
        body: JSON.stringify({ status, note: status === "approved" ? "Saque fake aprovado." : "Saque fake recusado." })
      });
      await loadWallet();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao atualizar saque.");
    }
  }

  useEffect(() => {
    loadWallet();
    const timer = window.setInterval(loadWallet, 6000);
    return () => window.clearInterval(timer);
  }, []);

  if (!token) return null;

  return (
    <>
      <button className="wallet-float-button" onClick={() => { setOpen(true); loadWallet(); }}>
        <Wallet size={18} />
        Carteira
      </button>

      {open && (
        <div className="wallet-backdrop">
          <section className="wallet-card">
            <div className="wallet-header">
              <div>
                <span className="eyebrow">Creator</span>
                <h2>Carteira</h2>
                <p>Ganhos fake por presentes recebidos.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar carteira"><X /></button>
            </div>

            <div className="wallet-actions">
              <button onClick={loadWallet}><RefreshCw size={16} /> Atualizar</button>
              <button><Coins size={16} /> Saque fake</button>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="wallet-success"><CheckCircle2 size={16} /> {success}</div>}

            {stats && (
              <div className="wallet-grid">
                <WalletStat label="Disponível" value={stats.available} />
                <WalletStat label="Ganhos" value={stats.totalEarned} />
                <WalletStat label="Pendente" value={stats.pending} />
                <WalletStat label="Pago" value={stats.paid} />
                <WalletStat label="Presentes" value={stats.gifts} />
                <WalletStat label="Vídeos" value={stats.videos} />
              </div>
            )}

            <section className="wallet-section">
              <h3>Pedir saque</h3>
              <input type="number" min={10} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
              <input placeholder="Chave PIX" value={pixKey} onChange={(event) => setPixKey(event.target.value)} />
              <button className="wallet-primary" onClick={requestPayout}><Banknote size={17} /> Solicitar saque fake</button>
            </section>

            <section className="wallet-section">
              <h3>Meus pedidos</h3>
              {payouts.length === 0 && <p className="wallet-empty">Nenhum pedido de saque ainda.</p>}
              {payouts.map((payout) => <PayoutRow payout={payout} key={payout.id} />)}
            </section>

            {isAdmin && (
              <section className="wallet-section">
                <h3>Admin saques</h3>
                {adminPayouts.length === 0 && <p className="wallet-empty">Nenhum saque pendente.</p>}
                {adminPayouts.map((payout) => (
                  <div className="payout-row" key={payout.id}>
                    <div>
                      <strong>@{payout.user?.user || "creator"} • {payout.amount} moedas</strong>
                      <small>PIX: {payout.pixKey}</small>
                      <em>Status: {payout.status}</em>
                    </div>
                    <div className="payout-actions">
                      <button onClick={() => updatePayout(payout.id, "approved")}>Aprovar</button>
                      <button onClick={() => updatePayout(payout.id, "rejected")}>Recusar</button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function WalletStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="wallet-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PayoutRow({ payout }: { payout: Payout }) {
  return (
    <div className="payout-row">
      <div>
        <strong>{payout.amount} moedas</strong>
        <small>PIX: {payout.pixKey}</small>
        <em>Status: {payout.status}</em>
      </div>
    </div>
  );
}
