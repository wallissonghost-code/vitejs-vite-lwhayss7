import { useEffect, useState } from "react";
import { Coins, RefreshCw, Shield, Trash2, Users, Video } from "lucide-react";

type AdminUser = {
  id: number;
  user: string;
  name: string;
  coins: number;
  followers: number;
};

type AdminVideo = {
  id: number;
  user: string;
  caption: string;
  likes: number;
  comments: number;
  gifts: number;
};

type Summary = {
  users: number;
  videos: number;
  comments: number;
  coins: number;
};

const API = "/api";

async function adminFetch<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro no painel admin.");
  return data as T;
}

export function AdminPanel({ token, onVideosChanged }: { token: string; onVideosChanged: () => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAdmin() {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextUsers, nextVideos] = await Promise.all([
        adminFetch<Summary>(`${API}/admin/summary`, token),
        adminFetch<AdminUser[]>(`${API}/admin/users`, token),
        adminFetch<AdminVideo[]>(`${API}/admin/videos`, token)
      ]);
      setSummary(nextSummary);
      setUsers(nextUsers);
      setVideos(nextVideos);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar admin.");
    } finally {
      setLoading(false);
    }
  }

  async function addCoins(userId: number, amount: number) {
    try {
      await adminFetch<AdminUser>(`${API}/admin/users/${userId}/coins`, token, {
        method: "POST",
        body: JSON.stringify({ amount })
      });
      await loadAdmin();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao alterar moedas.");
    }
  }

  async function deleteVideo(videoId: number) {
    const ok = confirm("Apagar esse vídeo? Essa ação não volta.");
    if (!ok) return;
    try {
      await adminFetch(`${API}/admin/videos/${videoId}`, token, { method: "DELETE" });
      await loadAdmin();
      onVideosChanged();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao apagar vídeo.");
    }
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  return (
    <div className="admin-panel">
      <div className="admin-title-row">
        <div>
          <span className="eyebrow">Admin</span>
          <h2>Painel do Ghost</h2>
        </div>
        <button onClick={loadAdmin} disabled={loading}>
          <RefreshCw size={18} />
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="admin-summary-grid">
        <AdminStat icon={<Users />} label="Usuários" value={summary?.users ?? 0} />
        <AdminStat icon={<Video />} label="Vídeos" value={summary?.videos ?? 0} />
        <AdminStat icon={<Shield />} label="Comentários" value={summary?.comments ?? 0} />
        <AdminStat icon={<Coins />} label="Moedas" value={summary?.coins ?? 0} />
      </div>

      <section className="admin-card">
        <h3>Usuários</h3>
        {users.map((user) => (
          <div className="admin-row" key={user.id}>
            <div>
              <strong>@{user.user}</strong>
              <small>{user.name} • {user.coins} moedas</small>
            </div>
            <div className="admin-actions">
              <button onClick={() => addCoins(user.id, 100)}>+100</button>
              <button onClick={() => addCoins(user.id, -100)}>-100</button>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-card">
        <h3>Vídeos</h3>
        {videos.map((video) => (
          <div className="admin-row" key={video.id}>
            <div>
              <strong>@{video.user}</strong>
              <small>{video.caption.slice(0, 58)} • {video.likes} curtidas</small>
            </div>
            <button className="danger-button" onClick={() => deleteVideo(video.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function AdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="admin-stat">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
