import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Tv, Video, X } from "lucide-react";

type Room = {
  id: number;
  title: string;
  viewers: number;
  gifts: number;
  coverUrl: string;
  creator: { user: string; name: string; avatar: string } | null;
};

type Peer = {
  id: number;
  roomId: number;
  status: string;
  hasOffer: boolean;
  hasAnswer: boolean;
};

const TOKEN_KEY = "gxst-token";
const VISITOR_KEY = "gxst-visitor-id";
const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

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
  if (!response.ok) throw new Error(data?.error || "Erro na câmera beta.");
  return data as T;
}

export function CameraBetaPanel() {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [mode, setMode] = useState<"idle" | "creator" | "viewer">("idle");
  const [status, setStatus] = useState("Câmera beta pronta.");
  const [error, setError] = useState("");
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef(new Map<number, RTCPeerConnection>());
  const addedIce = useRef(new Map<number, number>());

  async function loadRooms() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    try {
      const list = await api<Room[]>("/api/live/rooms", savedToken);
      setRooms(list);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar salas.");
    }
  }

  async function startCamera(room: Room) {
    if (!token) {
      alert("Faça login para transmitir com câmera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setActiveRoom(room);
      setMode("creator");
      setStatus("Câmera ligada. Aguardando espectadores WebRTC...");
      await api(`/api/live/rooms/${room.id}/join`, token, {
        method: "POST",
        headers: { "x-gxst-visitor": visitorId() },
        body: JSON.stringify({ visitorId: visitorId() })
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a câmera.");
    }
  }

  async function connectAsViewer(room: Room) {
    try {
      setActiveRoom(room);
      setMode("viewer");
      setStatus("Entrando na transmissão WebRTC...");
      const peer = await api<Peer>(`/api/live/rooms/${room.id}/webrtc/viewer`, token, {
        method: "POST",
        headers: { "x-gxst-visitor": visitorId() },
        body: JSON.stringify({ visitorId: visitorId() })
      });
      await buildViewerPeer(peer.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao assistir câmera.");
    }
  }

  async function buildCreatorPeer(peer: Peer) {
    if (!localStreamRef.current || peerConnections.current.has(peer.id)) return;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current.set(peer.id, pc);
    localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current as MediaStream));
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      api(`/api/live/webrtc/peers/${peer.id}/ice`, token, {
        method: "POST",
        body: JSON.stringify({ role: "creator", candidate: event.candidate.toJSON() })
      }).catch(() => {});
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await api(`/api/live/webrtc/peers/${peer.id}/offer`, token, { method: "POST", body: JSON.stringify({ sdp: offer.sdp }) });
    setStatus("Oferta WebRTC enviada para espectador.");
  }

  async function pollCreatorPeers() {
    if (!activeRoom || mode !== "creator" || !token) return;
    try {
      const peers = await api<Peer[]>(`/api/live/rooms/${activeRoom.id}/webrtc/peers`, token);
      await Promise.all(peers.map(buildCreatorPeer));
      await Promise.all(peers.map(async (peer) => {
        const pc = peerConnections.current.get(peer.id);
        if (!pc) return;
        if (!pc.remoteDescription) {
          const answer = await api<{ sdp: string }>(`/api/live/webrtc/peers/${peer.id}/answer`, token).catch(() => ({ sdp: "" }));
          if (answer.sdp) await pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
        }
        await pullIce(peer.id, "creator", pc);
      }));
    } catch {
      return;
    }
  }

  async function buildViewerPeer(peerId: number) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current.set(peerId, pc);
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) remoteVideoRef.current.srcObject = stream;
      setStatus("Transmissão recebida.");
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      api(`/api/live/webrtc/peers/${peerId}/ice`, token, {
        method: "POST",
        body: JSON.stringify({ role: "viewer", candidate: event.candidate.toJSON() })
      }).catch(() => {});
    };

    const offerTimer = window.setInterval(async () => {
      try {
        const payload = await api<{ sdp: string }>(`/api/live/webrtc/peers/${peerId}/offer`, token);
        if (!payload.sdp || pc.remoteDescription) return;
        await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await api(`/api/live/webrtc/peers/${peerId}/answer`, token, { method: "POST", body: JSON.stringify({ sdp: answer.sdp }) });
        setStatus("Resposta WebRTC enviada. Conectando câmera...");
        window.clearInterval(offerTimer);
      } catch {
        return;
      }
    }, 1200);

    const iceTimer = window.setInterval(() => pullIce(peerId, "viewer", pc), 1500);
    window.setTimeout(() => window.clearInterval(iceTimer), 90000);
  }

  async function pullIce(peerId: number, role: "creator" | "viewer", pc: RTCPeerConnection) {
    const payload = await api<{ candidates: RTCIceCandidateInit[] }>(`/api/live/webrtc/peers/${peerId}/ice?role=${role}`, token).catch(() => ({ candidates: [] }));
    const start = addedIce.current.get(peerId) || 0;
    const next = payload.candidates.slice(start);
    for (const candidate of next) {
      await pc.addIceCandidate(candidate).catch(() => {});
    }
    addedIce.current.set(peerId, payload.candidates.length);
  }

  function stopAll() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    addedIce.current.clear();
    setMode("idle");
    setStatus("Câmera beta parada.");
  }

  useEffect(() => {
    loadRooms();
    const timer = window.setInterval(loadRooms, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open || mode !== "creator") return;
    const timer = window.setInterval(pollCreatorPeers, 1800);
    return () => window.clearInterval(timer);
  }, [open, mode, activeRoom?.id, token]);

  return (
    <>
      <button className="dm-float-button" style={{ top: 322 }} onClick={() => { setOpen(true); loadRooms(); }}>
        <Camera size={18} /> Câmera
      </button>

      {open && (
        <div className="dm-backdrop">
          <section className="dm-card">
            <div className="dm-header">
              <div>
                <span className="eyebrow">WebRTC Beta</span>
                <h2>Câmera ao vivo</h2>
                <p>{status}</p>
              </div>
              <button onClick={() => { setOpen(false); stopAll(); }} aria-label="Fechar câmera"><X /></button>
            </div>

            <div className="dm-actions">
              <button onClick={loadRooms}><RefreshCw size={16} /> Atualizar</button>
              <button onClick={stopAll}><Video size={16} /> Parar câmera</button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="dm-layout">
              <aside className="dm-sidebar">
                <h3>Salas ao vivo</h3>
                {rooms.length === 0 && <p className="dm-empty">Nenhuma sala ativa.</p>}
                {rooms.map((room) => (
                  <div className="dm-thread" key={room.id}>
                    <img src={room.coverUrl || room.creator?.avatar} alt={room.title} />
                    <div>
                      <strong>{room.title}</strong>
                      <small>@{room.creator?.user} • {room.viewers} vendo</small>
                    </div>
                    <button onClick={() => startCamera(room)}>Transmitir</button>
                    <button onClick={() => connectAsViewer(room)}>Assistir</button>
                  </div>
                ))}
              </aside>

              <main className="dm-chat-area">
                <div className="dm-chat-title">
                  <Tv size={28} />
                  <div>
                    <strong>{activeRoom ? activeRoom.title : "Escolha uma sala"}</strong>
                    <small>{mode === "creator" ? "Modo transmissor" : mode === "viewer" ? "Modo espectador" : "Beta WebRTC"}</small>
                  </div>
                </div>

                <div className="dm-messages" style={{ height: 360 }}>
                  {mode === "creator" && <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", borderRadius: 18, background: "#000" }} />}
                  {mode === "viewer" && <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 18, background: "#000" }} />}
                  {mode === "idle" && <p className="dm-empty">Clique em Transmitir para abrir sua câmera ou Assistir para receber a transmissão beta.</p>}
                </div>
              </main>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
