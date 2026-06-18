import { useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw, Send, X, Zap } from "lucide-react";

type VideoItem = {
  id: number;
  user: string;
  caption: string;
  videoUrl: string;
  comments: number;
};

type LiveComment = {
  id: number;
  videoId: number;
  user: string;
  name: string;
  avatar: string;
  text: string;
  createdAt: string;
};

const TOKEN_KEY = "gxst-token";

async function api<T>(url: string, token = "", options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro nos comentários.");
  return data as T;
}

export function LiveCommentsPanel() {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [latestId, setLatestId] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const selectedVideo = useMemo(() => videos.find((video) => video.id === selectedId) || null, [videos, selectedId]);

  async function loadVideos() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    try {
      const nextVideos = await api<VideoItem[]>("/api/videos", savedToken);
      setVideos(nextVideos);
      if (!selectedId && nextVideos.length) setSelectedId(nextVideos[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar vídeos.");
    }
  }

  async function loadComments(reset = false) {
    if (!selectedId) return;
    const afterId = reset ? 0 : latestId;
    try {
      const payload = await api<{ comments: LiveComment[]; latestId: number }>(`/api/videos/${selectedId}/comments/live?afterId=${afterId}`, token);
      if (reset) {
        setComments(payload.comments);
      } else if (payload.comments.length) {
        setComments((current) => {
          const ids = new Set(current.map((item) => item.id));
          return [...current, ...payload.comments.filter((item) => !ids.has(item.id))].slice(-80);
        });
      }
      setLatestId((current) => Math.max(current, payload.latestId || 0));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar comentários.");
    }
  }

  async function sendComment() {
    const cleanText = text.trim();
    if (!selectedId || !cleanText) return;
    if (!token) {
      alert("Faça login para comentar.");
      return;
    }

    try {
      const payload = await api<{ comment: LiveComment; latestId: number }>(`/api/videos/${selectedId}/comments/live`, token, {
        method: "POST",
        body: JSON.stringify({ text: cleanText })
      });
      setComments((current) => [...current, payload.comment].slice(-80));
      setLatestId(payload.latestId || payload.comment.id);
      setText("");
      await loadVideos();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao comentar.");
    }
  }

  useEffect(() => {
    loadVideos();
    const timer = window.setInterval(loadVideos, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setComments([]);
    setLatestId(0);
    loadComments(true);
  }, [selectedId]);

  useEffect(() => {
    if (!open || !selectedId) return;
    const timer = window.setInterval(() => loadComments(false), 1800);
    return () => window.clearInterval(timer);
  }, [open, selectedId, latestId, token]);

  return (
    <>
      <button className="live-comments-float-button" onClick={() => { setOpen(true); loadVideos(); }}>
        <MessageCircle size={18} />
        Comentários
      </button>

      {open && (
        <div className="live-comments-backdrop">
          <section className="live-comments-card">
            <div className="live-comments-header">
              <div>
                <span className="eyebrow">Live</span>
                <h2>Comentários</h2>
                <p>Atualizando automaticamente.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar comentários"><X /></button>
            </div>

            <div className="live-comments-actions">
              <button onClick={() => loadComments(true)}><RefreshCw size={16} /> Atualizar</button>
              <button><Zap size={16} /> Tempo real</button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <select className="live-video-select" value={selectedId || ""} onChange={(event) => setSelectedId(Number(event.target.value))}>
              {videos.map((video) => <option key={video.id} value={video.id}>@{video.user} — {video.caption.slice(0, 44)}</option>)}
            </select>

            {selectedVideo && (
              <div className="live-video-preview">
                <video src={selectedVideo.videoUrl} muted playsInline preload="metadata" />
                <div>
                  <strong>@{selectedVideo.user}</strong>
                  <p>{selectedVideo.caption}</p>
                  <small>{comments.length} carregados • {selectedVideo.comments} no total</small>
                </div>
              </div>
            )}

            <div className="live-comments-list">
              {comments.length === 0 && <p className="live-empty">Ainda sem comentários carregados.</p>}
              {comments.map((comment) => (
                <article className="live-comment" key={comment.id}>
                  <img src={comment.avatar} alt={comment.name} />
                  <div>
                    <strong>@{comment.user}</strong>
                    <p>{comment.text}</p>
                    <small>{new Date(comment.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                </article>
              ))}
            </div>

            <div className="live-comment-form">
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva um comentário..." maxLength={300} onKeyDown={(event) => { if (event.key === "Enter") sendComment(); }} />
              <button onClick={sendComment}><Send size={17} /></button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
