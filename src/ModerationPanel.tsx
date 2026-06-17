import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";

type VideoItem = {
  id: number;
  user: string;
  caption: string;
  videoUrl: string;
  likes: number;
};

type CurrentUser = {
  user: string;
};

type ReportItem = {
  id: number;
  videoId: number;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  reporter?: { user: string; name: string } | null;
  video?: VideoItem | null;
};

const TOKEN_KEY = "gxst-token";
const reasons = ["Conteúdo ofensivo", "Spam ou golpe", "Assédio", "Conteúdo inadequado", "Direitos autorais", "Outro motivo"];

async function apiRequest<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro na moderação.");
  return data as T;
}

export function ModerationPanel() {
  const [token, setToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadState() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    if (!savedToken) return;

    try {
      const me = await apiRequest<CurrentUser>("/api/auth/me", savedToken);
      setIsAdmin(me.user === "ghost");

      const nextVideos = await apiRequest<VideoItem[]>("/api/videos", savedToken);
      setVideos(nextVideos);
      if (!selectedVideo && nextVideos.length) setSelectedVideo(nextVideos[0]);

      if (me.user === "ghost") {
        const nextReports = await apiRequest<ReportItem[]>("/api/admin/reports", savedToken);
        setReports(nextReports);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar moderação.");
    }
  }

  async function submitReport() {
    if (!token || !selectedVideo) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/videos/${selectedVideo.id}/report`, token, {
        method: "POST",
        body: JSON.stringify({ reason, details })
      });
      setSuccess("Denúncia enviada para análise.");
      setDetails("");
      await loadState();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao denunciar vídeo.");
    }
  }

  async function updateReport(reportId: number, status: string) {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/reports/${reportId}/status`, token, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await loadState();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao atualizar denúncia.");
    }
  }

  useEffect(() => {
    loadState();
    const timer = window.setInterval(loadState, 5000);
    return () => window.clearInterval(timer);
  }, []);

  if (!token) return null;

  return (
    <>
      <button className="moderation-float-button" onClick={() => { setOpen(true); loadState(); }}>
        <Flag size={18} />
        Denunciar
      </button>

      {open && (
        <div className="moderation-backdrop">
          <section className="moderation-card">
            <div className="moderation-header">
              <div>
                <span className="eyebrow">Segurança</span>
                <h2>Denúncias</h2>
                <p>Ajude a manter o GXST Vibes limpo.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar denúncias"><X /></button>
            </div>

            <div className="moderation-actions">
              <button onClick={loadState}><RefreshCw size={16} /> Atualizar</button>
              {isAdmin && <button><ShieldAlert size={16} /> Admin</button>}
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="moderation-success"><CheckCircle2 size={16} /> {success}</div>}

            <section className="moderation-section">
              <h3>Denunciar vídeo</h3>
              <select value={selectedVideo?.id || ""} onChange={(event) => {
                const video = videos.find((item) => item.id === Number(event.target.value)) || null;
                setSelectedVideo(video);
              }}>
                {videos.map((video) => <option key={video.id} value={video.id}>@{video.user} — {video.caption.slice(0, 45)}</option>)}
              </select>
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                {reasons.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <textarea placeholder="Detalhe opcional da denúncia..." value={details} onChange={(event) => setDetails(event.target.value)} />
              <button className="moderation-primary" onClick={submitReport}><AlertTriangle size={17} /> Enviar denúncia</button>
            </section>

            {isAdmin && (
              <section className="moderation-section">
                <h3>Painel admin de denúncias</h3>
                {reports.length === 0 && <p className="moderation-empty">Nenhuma denúncia ainda.</p>}
                {reports.map((report) => (
                  <div className="report-row" key={report.id}>
                    <div>
                      <strong>{report.reason}</strong>
                      <small>Vídeo #{report.videoId} • @{report.video?.user || "removido"} • denunciado por @{report.reporter?.user || "desconhecido"}</small>
                      {report.details && <p>{report.details}</p>}
                      <em>Status: {report.status}</em>
                    </div>
                    <div className="report-actions">
                      <button onClick={() => updateReport(report.id, "reviewed")}>Revisada</button>
                      <button onClick={() => updateReport(report.id, "dismissed")}>Dispensar</button>
                      <button className="report-danger" onClick={() => updateReport(report.id, "removed")}><Trash2 size={15} /></button>
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
