import { useEffect, useState } from "react";
import { Bell, CheckCheck, Gift, Heart, MessageCircle, MessageSquareText, RefreshCw, UserPlus, X } from "lucide-react";

type NotificationItem = {
  id: number;
  actorUser: string;
  type: "comment" | "like" | "gift" | "follow" | "dm" | string;
  videoId?: number | null;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotificationResponse = {
  unread: number;
  notifications: NotificationItem[];
};

const TOKEN_KEY = "gxst-token";

function iconFor(type: string) {
  if (type === "comment") return <MessageCircle size={18} />;
  if (type === "like") return <Heart size={18} />;
  if (type === "gift") return <Gift size={18} />;
  if (type === "follow") return <UserPlus size={18} />;
  if (type === "dm") return <MessageSquareText size={18} />;
  return <Bell size={18} />;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function NotificationsPanel() {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");

  async function loadNotifications() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    if (!savedToken) {
      setUnread(0);
      setItems([]);
      return;
    }

    try {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Erro ao carregar notificações.");
      const payload = data as NotificationResponse;
      setUnread(payload.unread);
      setItems(payload.notifications);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro nas notificações.");
    }
  }

  async function markAllRead() {
    if (!token) return;
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadNotifications();
    } catch {
      return;
    }
  }

  async function markOneRead(id: number) {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadNotifications();
    } catch {
      return;
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 5000);
    return () => window.clearInterval(timer);
  }, []);

  if (!token) return null;

  return (
    <>
      <button className="notifications-float-button" onClick={() => setOpen(true)}>
        <Bell size={19} />
        Inbox
        {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notifications-backdrop">
          <section className="notifications-card">
            <div className="notifications-header">
              <div>
                <span className="eyebrow">Tempo real</span>
                <h2>Notificações</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar notificações">
                <X />
              </button>
            </div>

            <div className="notifications-actions">
              <button onClick={loadNotifications}>
                <RefreshCw size={16} /> Atualizar
              </button>
              <button onClick={markAllRead}>
                <CheckCheck size={16} /> Marcar lidas
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="notifications-list">
              {items.length === 0 && <p className="notifications-empty">Nenhuma notificação ainda.</p>}
              {items.map((item) => (
                <button
                  className={item.read ? "notification-real read" : "notification-real"}
                  key={item.id}
                  onClick={() => markOneRead(item.id)}
                >
                  <div className="notification-real-icon">{iconFor(item.type)}</div>
                  <div>
                    <strong>{item.message}</strong>
                    <small>{timeLabel(item.createdAt)}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
