import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Crown, Eye, Gift, Heart, RefreshCw, TrendingUp, Video, X } from "lucide-react";

type Summary = {
  videos: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  gifts: number;
  score: number;
  estimatedEarnings: number;
  pendingPayouts: number;
  paidPayouts: number;
  paidPayments: number;
};

type TimelinePoint = {
  day: string;
  videos: number;
  views: number;
  comments: number;
};

type TopVideo = {
  id: number;
  user: string;
  caption: string;
  videoUrl: string;
  views: number;
  likes: number;
  comments: number;
  gifts: number;
  performanceScore: number;
};

type CreatorAnalytics = {
  summary: Summary;
  timeline: TimelinePoint[];
  topVideos: TopVideo[];
};

type AdminAnalytics = {
  totals: Record<string, number>;
  topCreators: Array<{
    user: string;
    name: string;
    videos: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    gifts: number;
    score: number;
  }>;
  topVideos: TopVideo[];
};

type CurrentUser = { user: string };

const TOKEN_KEY = "gxst-token";

async function analyticsRequest<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro ao carregar métricas.");
  return data as T;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AnalyticsPanel() {
  const [token, setToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [creator, setCreator] = useState<CreatorAnalytics | null>(null);
  const [admin, setAdmin] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    if (!savedToken) return;

    try {
      const [me, creatorData] = await Promise.all([
        analyticsRequest<CurrentUser>("/api/auth/me", savedToken),
        analyticsRequest<CreatorAnalytics>("/api/analytics/creator", savedToken)
      ]);
      setCreator(creatorData);
      setIsAdmin(me.user === "ghost");
      if (me.user === "ghost") {
        const adminData = await analyticsRequest<AdminAnalytics>("/api/admin/analytics", savedToken);
        setAdmin(adminData);
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro nas métricas.");
    }
  }

  useEffect(() => {
    loadAnalytics();
    const timer = window.setInterval(loadAnalytics, 8000);
    return () => window.clearInterval(timer);
  }, []);

  if (!token) return null;

  return (
    <>
      <button className="analytics-float-button" onClick={() => { setOpen(true); loadAnalytics(); }}>
        <BarChart3 size={18} />
        Métricas
      </button>

      {open && (
        <div className="analytics-backdrop">
          <section className="analytics-card">
            <div className="analytics-header">
              <div>
                <span className="eyebrow">Dashboard</span>
                <h2>Métricas</h2>
                <p>Desempenho do criador e visão admin.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar métricas"><X /></button>
            </div>

            <div className="analytics-actions">
              <button onClick={loadAnalytics}><RefreshCw size={16} /> Atualizar</button>
              <button><TrendingUp size={16} /> Performance</button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            {creator && (
              <>
                <section className="analytics-section">
                  <h3>Minha conta</h3>
                  <div className="analytics-grid">
                    <Metric icon={<Video />} label="Vídeos" value={creator.summary.videos} />
                    <Metric icon={<Eye />} label="Views" value={creator.summary.views} />
                    <Metric icon={<Heart />} label="Curtidas" value={creator.summary.likes} />
                    <Metric icon={<Gift />} label="Presentes" value={creator.summary.gifts} />
                    <Metric icon={<Crown />} label="Score" value={creator.summary.score} />
                    <Metric icon={<BarChart3 />} label="Pagos" value={creator.summary.paidPayments} />
                  </div>
                </section>

                <section className="analytics-section">
                  <h3>Últimos 7 dias</h3>
                  <div className="timeline-list">
                    {creator.timeline.map((item) => (
                      <div className="timeline-row" key={item.day}>
                        <strong>{item.day.slice(5)}</strong>
                        <span>Views {item.views}</span>
                        <span>Comentários {item.comments}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="analytics-section">
                  <h3>Meus melhores vídeos</h3>
                  {creator.topVideos.length === 0 && <p className="analytics-empty">Nenhum vídeo publicado ainda.</p>}
                  {creator.topVideos.map((video) => <VideoRow key={video.id} video={video} />)}
                </section>
              </>
            )}

            {isAdmin && admin && (
              <section className="analytics-section admin-analytics">
                <h3>Admin geral</h3>
                <div className="analytics-grid">
                  <Metric icon={<Video />} label="Vídeos" value={admin.totals.videos || 0} />
                  <Metric icon={<Eye />} label="Views" value={admin.totals.views || 0} />
                  <Metric icon={<Heart />} label="Curtidas" value={admin.totals.likes || 0} />
                  <Metric icon={<BarChart3 />} label="Pagamentos" value={admin.totals.paidPayments || 0} />
                  <Metric icon={<Crown />} label="Receita" value={money(admin.totals.revenue || 0)} />
                  <Metric icon={<Gift />} label="Denúncias" value={admin.totals.openReports || 0} />
                </div>

                <h3>Top criadores</h3>
                {admin.topCreators.map((creator) => (
                  <div className="creator-rank-row" key={creator.user}>
                    <strong>@{creator.user}</strong>
                    <span>{creator.score} pts • {creator.views} views • {creator.videos} vídeos</span>
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

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="metric-box">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function VideoRow({ video }: { video: TopVideo }) {
  return (
    <div className="analytics-video-row">
      <video src={video.videoUrl} muted playsInline preload="metadata" />
      <div>
        <strong>{video.caption}</strong>
        <small>{video.performanceScore} pts • {video.views} views • {video.likes} curtidas</small>
      </div>
    </div>
  );
}
