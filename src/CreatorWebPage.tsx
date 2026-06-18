import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Heart, Share2, UserPlus, Video } from "lucide-react";

type CreatorProfile = {
  id: number;
  user: string;
  name: string;
  bio: string;
  avatar: string;
  followers: number;
};

type CreatorVideo = {
  id: number;
  user: string;
  videoUrl: string;
  caption: string;
  likes: number;
  comments: number;
  gifts: number;
};

type CreatorResponse = {
  profile: CreatorProfile;
  stats: {
    videos: number;
    likes: number;
    gifts: number;
    points: number;
    followers: number;
    following: boolean;
  };
  videos: CreatorVideo[];
};

const TOKEN_KEY = "gxst-token";

function usernameFromPath() {
  const match = window.location.pathname.match(/^\/@([a-zA-Z0-9._-]+)/);
  return match?.[1]?.toLowerCase() || "";
}

export function CreatorWebPage() {
  const [username, setUsername] = useState(usernameFromPath());
  const [data, setData] = useState<CreatorResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadCreator(user = usernameFromPath()) {
    setUsername(user);
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      const response = await fetch(`/api/public/profile/${user}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Perfil não encontrado.");
      setData(payload as CreatorResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao abrir página do criador.");
    } finally {
      setLoading(false);
    }
  }

  async function followCreator() {
    if (!data) return;
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      alert("Faça login para seguir esse criador.");
      return;
    }
    try {
      const response = await fetch(`/api/public/profile/${data.profile.user}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Erro ao seguir.");
      setData(payload as CreatorResponse);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao seguir criador.");
    }
  }

  async function shareCreator() {
    if (!data) return;
    const url = `${window.location.origin}/@${data.profile.user}`;
    const title = `${data.profile.name} no GXST Vibes`;
    if (navigator.share) {
      await navigator.share({ title, text: `Veja o perfil @${data.profile.user}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    alert("Link copiado.");
  }

  useEffect(() => {
    loadCreator();
    const onPop = () => loadCreator(usernameFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!username) return null;

  return (
    <main className="creator-page-shell">
      <section className="creator-hero">
        <button className="creator-back" onClick={() => { window.history.pushState({}, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }}>
          <ArrowLeft size={18} /> Voltar ao app
        </button>

        {loading && <div className="creator-loading">Carregando página...</div>}
        {error && <div className="creator-error">{error}</div>}

        {data && (
          <>
            <div className="creator-cover-glow" />
            <div className="creator-profile-card">
              <img src={data.profile.avatar} alt={data.profile.name} />
              <div>
                <span className="eyebrow">Página pública</span>
                <h1>{data.profile.name}</h1>
                <strong>@{data.profile.user}</strong>
                <p>{data.profile.bio || "Criador no GXST Vibes."}</p>
              </div>
            </div>

            <div className="creator-stats-grid">
              <CreatorStat label="Vídeos" value={data.stats.videos} />
              <CreatorStat label="Curtidas" value={data.stats.likes} />
              <CreatorStat label="Presentes" value={data.stats.gifts} />
              <CreatorStat label="Pontos" value={data.stats.points} />
            </div>

            <div className="creator-page-actions">
              <button onClick={followCreator}>
                <UserPlus size={18} /> {data.stats.following ? "Seguindo" : "Seguir"}
              </button>
              <button onClick={shareCreator}>
                <Share2 size={18} /> Compartilhar
              </button>
              <button onClick={() => window.open(`/#/@${data.profile.user}`, "_self")}>
                <ExternalLink size={18} /> Abrir no app
              </button>
            </div>
          </>
        )}
      </section>

      {data && (
        <section className="creator-vitrine">
          <div className="creator-vitrine-title">
            <div>
              <span className="eyebrow">Vitrine</span>
              <h2>Vídeos de @{data.profile.user}</h2>
            </div>
            <Video size={23} />
          </div>

          {data.videos.length === 0 && <p className="creator-empty">Esse criador ainda não publicou vídeos.</p>}

          <div className="creator-video-grid">
            {data.videos.map((video) => (
              <article className="creator-video-card" key={video.id}>
                <video src={video.videoUrl} controls playsInline preload="metadata" />
                <div>
                  <p>{video.caption}</p>
                  <small><Heart size={13} /> {video.likes} curtidas • {video.comments} comentários • {video.gifts} presentes</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function CreatorStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="creator-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
