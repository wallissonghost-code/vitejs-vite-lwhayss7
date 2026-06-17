import { useEffect, useState } from "react";
import { CheckCircle2, Link2, RefreshCw, UserPlus, X } from "lucide-react";

type PublicVideo = {
  id: number;
  videoUrl: string;
  caption: string;
  likes: number;
  comments: number;
  gifts: number;
};

type PublicPayload = {
  profile: {
    user: string;
    name: string;
    bio: string;
    avatar: string;
    followers: number;
  };
  stats: {
    videos: number;
    likes: number;
    gifts: number;
    points: number;
    followers: number;
    following: boolean;
  };
  videos: PublicVideo[];
};

const TOKEN_KEY = "gxst-token";

function getProfileFromHash() {
  const hash = window.location.hash || "";
  const match = hash.match(/^#\/@([a-zA-Z0-9._-]+)/);
  return match?.[1] || "";
}

async function requestProfile(username: string, token: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(`/api/public/profile/${username}`, { headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Perfil não encontrado.");
  return data as PublicPayload;
}

export function PublicProfileRouter() {
  const [username, setUsername] = useState(getProfileFromHash());
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProfile(nextUser = username) {
    if (!nextUser) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      const data = await requestProfile(nextUser, token);
      setPayload(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao abrir perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function followProfile() {
    if (!payload) return;
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      alert("Faça login para seguir perfis.");
      return;
    }

    try {
      const response = await fetch(`/api/public/profile/${payload.profile.user}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Erro ao seguir perfil.");
      setPayload(data as PublicPayload);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao seguir perfil.");
    }
  }

  async function shareProfile() {
    if (!payload) return;
    const link = `${window.location.origin}${window.location.pathname}#/@${payload.profile.user}`;
    try {
      if (navigator.share) await navigator.share({ title: payload.profile.name, text: `Perfil @${payload.profile.user} no GXST Vibes`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        alert("Link do perfil copiado.");
      }
    } catch {
      return;
    }
  }

  function closeProfile() {
    window.location.hash = "";
    setUsername("");
    setPayload(null);
    setError("");
  }

  useEffect(() => {
    function onHashChange() {
      const nextUser = getProfileFromHash();
      setUsername(nextUser);
      if (nextUser) loadProfile(nextUser);
      else setPayload(null);
    }

    window.addEventListener("hashchange", onHashChange);
    if (username) loadProfile(username);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (!username) return null;

  return (
    <div className="public-profile-backdrop">
      <section className="public-profile-card">
        <button className="public-close" onClick={closeProfile} aria-label="Fechar perfil">
          <X />
        </button>

        {loading && <p className="public-muted">Carregando perfil...</p>}
        {error && <div className="auth-error">{error}</div>}

        {payload && (
          <>
            <div className="public-cover"></div>
            <img className="public-avatar" src={payload.profile.avatar} alt={payload.profile.name} />
            <h2>
              @{payload.profile.user}
              <CheckCircle2 size={17} />
            </h2>
            <p>{payload.profile.bio}</p>

            <div className="public-stats">
              <div><strong>{payload.stats.videos}</strong><span>Vídeos</span></div>
              <div><strong>{payload.stats.followers}</strong><span>Seguidores</span></div>
              <div><strong>{payload.stats.points}</strong><span>Pontos</span></div>
            </div>

            <div className="public-actions">
              <button onClick={followProfile}>
                <UserPlus size={17} />
                {payload.stats.following ? "Seguindo" : "Seguir"}
              </button>
              <button onClick={shareProfile}>
                <Link2 size={17} />
                Compartilhar
              </button>
              <button onClick={() => loadProfile()}>
                <RefreshCw size={17} />
              </button>
            </div>

            <div className="public-video-grid">
              {payload.videos.map((video) => (
                <video key={video.id} src={video.videoUrl} muted loop playsInline controls />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
