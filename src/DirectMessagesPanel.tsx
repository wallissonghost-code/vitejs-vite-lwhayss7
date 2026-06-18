import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, RefreshCw, Search, Send, X } from "lucide-react";

type User = {
  id: number;
  user: string;
  name: string;
  avatar: string;
};

type Message = {
  id: number;
  text: string;
  createdAt: string;
  readAt?: string | null;
  senderId: number;
  recipientId: number;
  sender: User;
  recipient: User;
};

type Thread = {
  user: User;
  lastMessage: Message | null;
  unread: number;
};

type ThreadPayload = {
  user: User;
  latestId: number;
  messages: Message[];
};

type CurrentUser = User;

const TOKEN_KEY = "gxst-token";

async function dmApi<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro no chat.");
  return data as T;
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function DirectMessagesPanel() {
  const [token, setToken] = useState("");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [latestId, setLatestId] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const unreadTotal = useMemo(() => threads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0), [threads]);

  async function loadBase() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    if (!savedToken) return;
    try {
      const [currentUser, nextThreads] = await Promise.all([
        dmApi<CurrentUser>("/api/auth/me", savedToken),
        dmApi<Thread[]>("/api/dm/threads", savedToken)
      ]);
      setMe(currentUser);
      setThreads(nextThreads);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar chat.");
    }
  }

  async function searchUsers(nextQuery = query) {
    if (!token) return;
    try {
      const list = await dmApi<User[]>(`/api/dm/users?q=${encodeURIComponent(nextQuery)}`, token);
      setUsers(list);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao buscar usuários.");
    }
  }

  async function loadThread(user: User, reset = false) {
    if (!token) return;
    const after = reset ? 0 : latestId;
    try {
      const payload = await dmApi<ThreadPayload>(`/api/dm/thread/${user.user}?afterId=${after}`, token);
      setActiveUser(payload.user);
      if (reset) {
        setMessages(payload.messages);
      } else if (payload.messages.length) {
        setMessages((current) => {
          const ids = new Set(current.map((item) => item.id));
          return [...current, ...payload.messages.filter((item) => !ids.has(item.id))].slice(-120);
        });
      }
      setLatestId((current) => Math.max(current, payload.latestId || 0));
      await dmApi(`/api/dm/thread/${user.user}/read`, token, { method: "POST" }).catch(() => {});
      await loadBase();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao abrir conversa.");
    }
  }

  async function sendMessage() {
    const clean = text.trim();
    if (!activeUser || !clean || !token) return;
    try {
      const payload = await dmApi<{ message: Message }>(`/api/dm/thread/${activeUser.user}`, token, {
        method: "POST",
        body: JSON.stringify({ text: clean })
      });
      setMessages((current) => [...current, payload.message].slice(-120));
      setLatestId((current) => Math.max(current, payload.message.id));
      setText("");
      await loadBase();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao enviar mensagem.");
    }
  }

  function openThread(user: User) {
    setMessages([]);
    setLatestId(0);
    setActiveUser(user);
    loadThread(user, true);
  }

  useEffect(() => {
    loadBase();
    const timer = window.setInterval(loadBase, 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open || !token) return;
    searchUsers(query);
  }, [open, token]);

  useEffect(() => {
    if (!open || !activeUser) return;
    const timer = window.setInterval(() => loadThread(activeUser, false), 1800);
    return () => window.clearInterval(timer);
  }, [open, activeUser, latestId, token]);

  if (!token) return null;

  return (
    <>
      <button className="dm-float-button" onClick={() => { setOpen(true); loadBase(); }}>
        <MessageSquareText size={18} />
        Chat {unreadTotal > 0 && <b>{unreadTotal}</b>}
      </button>

      {open && (
        <div className="dm-backdrop">
          <section className="dm-card">
            <div className="dm-header">
              <div>
                <span className="eyebrow">Direct</span>
                <h2>Chat</h2>
                <p>{me ? `Logado como @${me.user}` : "Mensagens privadas."}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar chat"><X /></button>
            </div>

            <div className="dm-actions">
              <button onClick={loadBase}><RefreshCw size={16} /> Atualizar</button>
              <button onClick={() => searchUsers(query)}><Search size={16} /> Buscar</button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="dm-layout">
              <aside className="dm-sidebar">
                <input value={query} onChange={(event) => { setQuery(event.target.value); searchUsers(event.target.value); }} placeholder="Buscar usuário..." />

                <h3>Conversas</h3>
                {threads.length === 0 && <p className="dm-empty">Nenhuma conversa ainda.</p>}
                {threads.map((thread) => (
                  <button className="dm-thread" key={thread.user.id} onClick={() => openThread(thread.user)}>
                    <img src={thread.user.avatar} alt={thread.user.name} />
                    <div>
                      <strong>@{thread.user.user}</strong>
                      <small>{thread.lastMessage?.text || "Abrir conversa"}</small>
                    </div>
                    {thread.unread > 0 && <b>{thread.unread}</b>}
                  </button>
                ))}

                <h3>Usuários</h3>
                {users.map((user) => (
                  <button className="dm-thread" key={user.id} onClick={() => openThread(user)}>
                    <img src={user.avatar} alt={user.name} />
                    <div>
                      <strong>@{user.user}</strong>
                      <small>{user.name}</small>
                    </div>
                  </button>
                ))}
              </aside>

              <main className="dm-chat-area">
                {!activeUser && <p className="dm-empty">Escolha uma conversa para começar.</p>}

                {activeUser && (
                  <>
                    <div className="dm-chat-title">
                      <img src={activeUser.avatar} alt={activeUser.name} />
                      <div>
                        <strong>@{activeUser.user}</strong>
                        <small>{activeUser.name}</small>
                      </div>
                    </div>

                    <div className="dm-messages">
                      {messages.length === 0 && <p className="dm-empty">Sem mensagens carregadas.</p>}
                      {messages.map((message) => (
                        <article className={message.senderId === me?.id ? "dm-message mine" : "dm-message"} key={message.id}>
                          <p>{message.text}</p>
                          <small>{time(message.createdAt)}</small>
                        </article>
                      ))}
                    </div>

                    <div className="dm-form">
                      <input value={text} maxLength={500} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="Digite uma mensagem..." />
                      <button onClick={sendMessage}><Send size={17} /></button>
                    </div>
                  </>
                )}
              </main>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
