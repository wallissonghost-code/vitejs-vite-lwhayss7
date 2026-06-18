import { useEffect, useMemo, useState } from "react";
import { Gift, Radio, RefreshCw, Send, Users, X } from "lucide-react";

type PublicUser = {
  id: number;
  user: string;
  name: string;
  avatar: string;
};

type Room = {
  id: number;
  title: string;
  status: string;
  coverUrl: string;
  viewers: number;
  gifts: number;
  creator: PublicUser | null;
};

type ChatMessage = {
  id: number;
  roomId: number;
  user: string;
  name: string;
  avatar: string;
  text: string;
  createdAt: string;
};

const TOKEN_KEY = "gxst-token";
const VISITOR_KEY = "gxst-visitor-id";

function visitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const created = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(VISITOR_KEY, created);
  return created;
}

async function api<T>(url: string, token = "", options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro nas lives.");
  return data as T;
}

export function LiveRoomsPanel() {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latestId, setLatestId] = useState(0);
  const [title, setTitle] = useState("Live GXST Vibes");
  const [text, setText] = useState("");
  const [giftAmount, setGiftAmount] = useState(10);
  const [error, setError] = useState("");

  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => b.viewers - a.viewers || b.gifts - a.gifts), [rooms]);

  async function loadRooms() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    try {
      const list = await api<Room[]>("/api/live/rooms", savedToken);
      setRooms(list);
      if (activeRoom) {
        const updated = list.find((room) => room.id === activeRoom.id);
        if (updated) setActiveRoom(updated);
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar lives.");
    }
  }

  async function startRoom() {
    if (!token) {
      alert("Faça login para iniciar uma live.");
      return;
    }
    try {
      const room = await api<Room>("/api/live/rooms", token, {
        method: "POST",
        body: JSON.stringify({ title })
      });
      setActiveRoom(room);
      setMessages([]);
      setLatestId(0);
      await loadRooms();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao iniciar live.");
    }
  }

  async function enterRoom(room: Room) {
    setActiveRoom(room);
    setMessages([]);
    setLatestId(0);
    await joinRoom(room.id);
    await loadChat(room.id, true);
  }

  async function joinRoom(roomId = activeRoom?.id || 0) {
    if (!roomId) return;
    try {
      const payload = await api<{ viewers: number }>(`/api/live/rooms/${roomId}/join`, token, {
        method: "POST",
        headers: { "x-gxst-visitor": visitorId() },
        body: JSON.stringify({ visitorId: visitorId() })
      });
      setActiveRoom((current) => current && current.id === roomId ? { ...current, viewers: payload.viewers } : current);
    } catch {
      return;
    }
  }

  async function loadChat(roomId = activeRoom?.id || 0, reset = false) {
    if (!roomId) return;
    const after = reset ? 0 : latestId;
    try {
      const payload = await api<{ latestId: number; messages: ChatMessage[] }>(`/api/live/rooms/${roomId}/chat?afterId=${after}`, token);
      if (reset) {
        setMessages(payload.messages);
      } else if (payload.messages.length) {
        setMessages((current) => {
          const ids = new Set(current.map((item) => item.id));
          return [...current, ...payload.messages.filter((item) => !ids.has(item.id))].slice(-120);
        });
      }
      setLatestId((current) => Math.max(current, payload.latestId || 0));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro no chat da live.");
    }
  }

  async function sendMessage() {
    if (!activeRoom || !text.trim()) return;
    if (!token) {
      alert("Faça login para comentar na live.");
      return;
    }
    try {
      const payload = await api<{ message: ChatMessage }>(`/api/live/rooms/${activeRoom.id}/chat`, token, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setMessages((current) => [...current, payload.message].slice(-120));
      setLatestId((current) => Math.max(current, payload.message.id));
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao enviar mensagem.");
    }
  }

  async function sendGift() {
    if (!activeRoom || !token) {
      alert("Faça login para enviar presente.");
      return;
    }
    try {
      const payload = await api<{ room: Room }>(`/api/live/rooms/${activeRoom.id}/gift`, token, {
        method: "POST",
        body: JSON.stringify({ amount: giftAmount })
      });
      setActiveRoom(payload.room);
      await loadChat(activeRoom.id, false);
      await loadRooms();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao enviar presente.");
    }
  }

  async function endRoom() {
    if (!activeRoom || !token) return;
    try {
      await api(`/api/live/rooms/${activeRoom.id}/end`, token, { method: "POST" });
      setActiveRoom(null);
      setMessages([]);
      setLatestId(0);
      await loadRooms();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao encerrar live.");
    }
  }

  useEffect(() => {
    loadRooms();
    const timer = window.setInterval(loadRooms, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open || !activeRoom) return;
    const timer = window.setInterval(() => {
      joinRoom(activeRoom.id);
      loadChat(activeRoom.id, false);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [open, activeRoom?.id, latestId, token]);

  return (
    <>
      <button className="live-room-float-button" onClick={() => { setOpen(true); loadRooms(); }}>
        <Radio size={18} /> Ao Vivo
      </button>

      {open && (
        <div className="live-room-backdrop">
          <section className="live-room-card">
            <div className="live-room-header">
              <div>
                <span className="eyebrow">GXST Live</span>
                <h2>Ao Vivo</h2>
                <p>Lives fake com chat, espectadores e presentes.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar lives"><X /></button>
            </div>

            <div className="live-room-actions">
              <button onClick={loadRooms}><RefreshCw size={16} /> Atualizar</button>
              <button onClick={startRoom}><Radio size={16} /> Iniciar live</button>
            </div>

            <input className="live-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título da live" />
            {error && <div className="auth-error">{error}</div>}

            <div className="live-room-layout">
              <aside className="live-room-list">
                <h3>Salas ativas</h3>
                {sortedRooms.length === 0 && <p className="live-room-empty">Nenhuma live ativa.</p>}
                {sortedRooms.map((room) => (
                  <button className="live-room-item" key={room.id} onClick={() => enterRoom(room)}>
                    <img src={room.coverUrl || room.creator?.avatar} alt={room.title} />
                    <div>
                      <strong>{room.title}</strong>
                      <small>@{room.creator?.user || "criador"} • {room.viewers} vendo • {room.gifts} moedas</small>
                    </div>
                  </button>
                ))}
              </aside>

              <main className="live-room-stage">
                {!activeRoom && <p className="live-room-empty">Escolha uma sala ou inicie sua live.</p>}
                {activeRoom && (
                  <>
                    <div className="live-screen">
                      <img src={activeRoom.coverUrl || activeRoom.creator?.avatar} alt={activeRoom.title} />
                      <div>
                        <span>AO VIVO</span>
                        <h3>{activeRoom.title}</h3>
                        <p>@{activeRoom.creator?.user}</p>
                      </div>
                    </div>

                    <div className="live-stats-row">
                      <span><Users size={14} /> {activeRoom.viewers} espectadores</span>
                      <span><Gift size={14} /> {activeRoom.gifts} moedas</span>
                      <button onClick={endRoom}>Encerrar</button>
                    </div>

                    <div className="live-chat-list">
                      {messages.length === 0 && <p className="live-room-empty">Chat vazio.</p>}
                      {messages.map((message) => (
                        <article className="live-chat-message" key={message.id}>
                          <img src={message.avatar} alt={message.name} />
                          <div>
                            <strong>@{message.user}</strong>
                            <p>{message.text}</p>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="live-gift-row">
                      <input type="number" min={1} max={500} value={giftAmount} onChange={(event) => setGiftAmount(Number(event.target.value))} />
                      <button onClick={sendGift}><Gift size={16} /> Enviar presente</button>
                    </div>

                    <div className="live-chat-form">
                      <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Comente na live..." maxLength={220} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} />
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
