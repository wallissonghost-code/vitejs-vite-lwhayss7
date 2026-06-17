import { useEffect, useState } from "react";
import { Brain, Flame, Play, RefreshCw, X } from "lucide-react";

type RecommendedVideo = {
  id: number;
  user: string;
  name: string;
  avatar: string;
  videoUrl: string;
  caption: string;
  likes: number;
  comments: number;
  gifts: number;
  algorithmScore: number;
  reason: string;
  reasons: string[];
};

type FeedResponse = {
  mode: string;
  total: number;
  videos: RecommendedVideo[];
};

const TOKEN_KEY = "gxst-token";

export function AlgorithmFeed() {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("tendências");
  const [videos, setVideos] = useState<RecommendedVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<RecommendedVideo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadFeed() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/feed/recommended", {
        headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : undefined
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Erro ao carregar Feed IA.");
      const payload = data as FeedResponse;
      setMode(payload.mode);
      setVideos(payload.videos);
      setActiveVideo(payload.videos[0] || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro no algoritmo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <>
      <button className="algorithm-float-button" onClick={() => { setOpen(true); loadFeed(); }}>
        <Brain size={18} />
        Feed IA
      </button>

      {open && (
        <div className="algorithm-backdrop">
          <section className="algorithm-card">
            <div className="algorithm-header">
              <div>
                <span className="eyebrow">Algoritmo</span>
                <h2>Feed IA</h2>
                <p>{token ? "Recomendações personalizadas" : "Tendências gerais"} • modo {mode}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar feed ia">
                <X />
              </button>
            </div>

            <div className="algorithm-actions">
              <button onClick={loadFeed} disabled={loading}>
                <RefreshCw size={16} /> Atualizar
              </button>
              <button onClick={() => setActiveVideo(videos[0] || null)}>
                <Flame size={16} /> Melhor vídeo
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            {activeVideo && (
              <article className="algorithm-featured">
                <video src={activeVideo.videoUrl} controls playsInline />
                <div>
                  <strong>@{activeVideo.user}</strong>
                  <p>{activeVideo.caption}</p>
                  <small>Score {activeVideo.algorithmScore} • {activeVideo.reason}</small>
                </div>
              </article>
            )}

            <div className="algorithm-list">
              {videos.map((video, index) => (
                <button className="algorithm-row" key={video.id} onClick={() => setActiveVideo(video)}>
                  <span className="algorithm-rank">#{index + 1}</span>
                  <video src={video.videoUrl} muted loop playsInline />
                  <div>
                    <strong>@{video.user}</strong>
                    <small>{video.reason}</small>
                    <em>{video.algorithmScore} pts • {video.likes} curtidas</em>
                  </div>
                  <Play size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
