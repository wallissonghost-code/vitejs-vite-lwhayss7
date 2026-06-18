import { sqlite } from "./sqliteStore.js";

function makeRequireAuth(getAuthUser) {
  return function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Faça login para usar a câmera da live." });
    req.user = user;
    next();
  };
}

function initSignalStore() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS live_webrtc_peers (
      id INTEGER PRIMARY KEY,
      room_id INTEGER NOT NULL,
      viewer_user_id INTEGER,
      visitor_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'waiting',
      offer_sdp TEXT,
      answer_sdp TEXT,
      creator_ice TEXT NOT NULL DEFAULT '[]',
      viewer_ice TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES live_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_live_webrtc_room ON live_webrtc_peers(room_id);
    CREATE INDEX IF NOT EXISTS idx_live_webrtc_updated ON live_webrtc_peers(updated_at);
  `);
}

function cleanVisitorId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
}

function fromJson(value, fallback = []) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return fallback;
  }
}

function toJson(value) {
  return JSON.stringify(value || []);
}

function getRoom(roomId) {
  try {
    return sqlite.prepare("SELECT * FROM live_rooms WHERE id = ?").get(roomId);
  } catch {
    return null;
  }
}

function getPeer(peerId) {
  return sqlite.prepare("SELECT * FROM live_webrtc_peers WHERE id = ?").get(peerId);
}

function assertCreator(req, room) {
  return Boolean(req.user && room && (room.creator_user_id === req.user.id || req.user.user === "ghost"));
}

function peerPayload(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    viewerUserId: row.viewer_user_id,
    visitorId: row.visitor_id,
    status: row.status,
    hasOffer: Boolean(row.offer_sdp),
    hasAnswer: Boolean(row.answer_sdp),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function appendIce(peer, role, candidate) {
  const column = role === "creator" ? "creator_ice" : "viewer_ice";
  const list = fromJson(peer[column], []);
  list.push(candidate);
  sqlite.prepare(`UPDATE live_webrtc_peers SET ${column} = ?, updated_at = ? WHERE id = ?`).run(toJson(list.slice(-80)), new Date().toISOString(), peer.id);
}

export function registerLiveSignalRoutes(app, getAuthUser) {
  initSignalStore();
  const requireAuth = makeRequireAuth(getAuthUser);

  app.post("/api/live/rooms/:id/webrtc/viewer", (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!room || room.status !== "live") return res.status(404).json({ error: "Live não está ativa." });

    const user = getAuthUser(req);
    const visitorId = cleanVisitorId(req.body?.visitorId) || cleanVisitorId(req.headers["x-gxst-visitor"]) || cleanVisitorId(req.ip);
    const now = new Date().toISOString();
    const result = sqlite.prepare(`
      INSERT INTO live_webrtc_peers (room_id, viewer_user_id, visitor_id, status, created_at, updated_at)
      VALUES (?, ?, ?, 'waiting', ?, ?)
    `).run(roomId, user?.id || null, visitorId, now, now);

    const peer = getPeer(Number(result.lastInsertRowid));
    res.status(201).json(peerPayload(peer));
  });

  app.get("/api/live/rooms/:id/webrtc/peers", requireAuth, (req, res) => {
    const roomId = Number(req.params.id);
    const room = getRoom(roomId);
    if (!assertCreator(req, room)) return res.status(403).json({ error: "Apenas o criador pode ver conexões da live." });

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const rows = sqlite.prepare("SELECT * FROM live_webrtc_peers WHERE room_id = ? AND updated_at >= ? ORDER BY id DESC LIMIT 40").all(roomId, since);
    res.json(rows.map(peerPayload));
  });

  app.post("/api/live/webrtc/peers/:id/offer", requireAuth, (req, res) => {
    const peer = getPeer(Number(req.params.id));
    if (!peer) return res.status(404).json({ error: "Conexão não encontrada." });
    const room = getRoom(peer.room_id);
    if (!assertCreator(req, room)) return res.status(403).json({ error: "Apenas o criador pode enviar oferta." });
    const sdp = String(req.body.sdp || "");
    if (!sdp) return res.status(400).json({ error: "SDP vazio." });
    sqlite.prepare("UPDATE live_webrtc_peers SET offer_sdp = ?, status = 'offered', updated_at = ? WHERE id = ?").run(sdp, new Date().toISOString(), peer.id);
    res.json(peerPayload(getPeer(peer.id)));
  });

  app.get("/api/live/webrtc/peers/:id/offer", (req, res) => {
    const peer = getPeer(Number(req.params.id));
    if (!peer) return res.status(404).json({ error: "Conexão não encontrada." });
    res.json({ peer: peerPayload(peer), sdp: peer.offer_sdp || "" });
  });

  app.post("/api/live/webrtc/peers/:id/answer", (req, res) => {
    const peer = getPeer(Number(req.params.id));
    if (!peer) return res.status(404).json({ error: "Conexão não encontrada." });
    const sdp = String(req.body.sdp || "");
    if (!sdp) return res.status(400).json({ error: "SDP vazio." });
    sqlite.prepare("UPDATE live_webrtc_peers SET answer_sdp = ?, status = 'connected', updated_at = ? WHERE id = ?").run(sdp, new Date().toISOString(), peer.id);
    res.json(peerPayload(getPeer(peer.id)));
  });

  app.get("/api/live/webrtc/peers/:id/answer", requireAuth, (req, res) => {
    const peer = getPeer(Number(req.params.id));
    if (!peer) return res.status(404).json({ error: "Conexão não encontrada." });
    const room = getRoom(peer.room_id);
    if (!assertCreator(req, room)) return res.status(403).json({ error: "Apenas o criador pode ler resposta." });
    res.json({ peer: peerPayload(peer), sdp: peer.answer_sdp || "" });
  });

  app.post("/api/live/webrtc/peers/:id/ice", (req, res) => {
    const peer = getPeer(Number(req.params.id));
    if (!peer) return res.status(404).json({ error: "Conexão não encontrada." });
    const role = req.body.role === "creator" ? "creator" : "viewer";
    const candidate = req.body.candidate;
    if (!candidate) return res.status(400).json({ error: "ICE vazio." });

    if (role === "creator") {
      const user = getAuthUser(req);
      const room = getRoom(peer.room_id);
      if (!user || !(room.creator_user_id === user.id || user.user === "ghost")) return res.status(403).json({ error: "Criador inválido." });
    }

    appendIce(peer, role, candidate);
    res.json({ ok: true });
  });

  app.get("/api/live/webrtc/peers/:id/ice", (req, res) => {
    const peer = getPeer(Number(req.params.id));
    if (!peer) return res.status(404).json({ error: "Conexão não encontrada." });
    const role = req.query.role === "creator" ? "creator" : "viewer";
    const list = role === "creator" ? fromJson(peer.viewer_ice, []) : fromJson(peer.creator_ice, []);
    res.json({ candidates: list });
  });
}
