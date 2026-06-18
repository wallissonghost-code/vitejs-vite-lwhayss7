import { useEffect, useRef, useState } from "react";
import { Bell, Gift, Heart, MessageCircle, MessageSquareText, UserPlus, X } from "lucide-react";

type NotificationItem = {
  id: number;
  actorUser: string;
  type: "comment" | "like" | "gift" | "follow" | "dm" | string;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotificationResponse = {
  unread: number;
  notifications: NotificationItem[];
};

type Thread = {
  user: { user: string; name: string; avatar: string };
  lastMessage: { id: number; text: string; createdAt: string } | null;
  unread: number;
};

type Toast = {
  id: string;
  type: string;
  title: string;
  message: string;
};

const TOKEN_KEY = "gxst-token";
const PUSH_SEEN_KEY = "gxst-push-seen";

function iconFor(type: string) {
  if (type === "comment") return <MessageCircle size={18} />;
  if (type === "like") return <Heart size={18} />;
  if (type === "gift") return <Gift size={18} />;
  if (type === "follow") return <UserPlus size={18} />;
  if (type === "dm") return <MessageSquareText size={18} />;
  return <Bell size={18} />;
}

function loadSeen() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(PUSH_SEEN_KEY) || "[]"));
  } catch {
    return new Set<string>();
  }
}

function saveSeen(seen: Set<string>) {
  localStorage.setItem(PUSH_SEEN_KEY, JSON.stringify([...seen].slice(-400)));
}

export function InternalPushAlerts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef<Set<string>>(loadSeen());
  const readyRef = useRef(false);

  function pushToast(toast: Toast) {
    setToasts((current) => [toast, ...current.filter((item) => item.id !== toast.id)].slice(0, 4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 5200);
  }

  async function checkNotifications() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;

    try {
      const response = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      const payload = (await response.json()) as NotificationResponse;
      if (!response.ok) return;

      payload.notifications
        .filter((item) => !item.read)
        .slice(0, 8)
        .reverse()
        .forEach((item) => {
          const key = `notification-${item.id}`;
          if (seenRef.current.has(key)) return;
          seenRef.current.add(key);
          if (readyRef.current) {
            pushToast({ id: key, type: item.type, title: "Nova notificação", message: item.message });
          }
        });
    } catch {
      return;
    }
  }

  async function checkDmThreads() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;

    try {
      const response = await fetch("/api/dm/threads", { headers: { Authorization: `Bearer ${token}` } });
      const threads = (await response.json()) as Thread[];
      if (!response.ok) return;

      threads
        .filter((thread) => thread.unread > 0 && thread.lastMessage)
        .slice(0, 5)
        .reverse()
        .forEach((thread) => {
          const key = `dm-${thread.lastMessage?.id}`;
          if (seenRef.current.has(key)) return;
          seenRef.current.add(key);
          if (readyRef.current) {
            pushToast({
              id: key,
              type: "dm",
              title: `Mensagem de @${thread.user.user}`,
              message: thread.lastMessage?.text || "Nova mensagem privada."
            });
          }
        });
    } catch {
      return;
    }
  }

  async function checkAll() {
    await Promise.all([checkNotifications(), checkDmThreads()]);
    saveSeen(seenRef.current);
    if (!readyRef.current) readyRef.current = true;
  }

  useEffect(() => {
    checkAll();
    const timer = window.setInterval(checkAll, 3500);
    return () => window.clearInterval(timer);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="internal-push-stack">
      {toasts.map((toast) => (
        <article className="internal-push-toast" key={toast.id}>
          <div className="internal-push-icon">{iconFor(toast.type)}</div>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Fechar alerta">
            <X size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}
