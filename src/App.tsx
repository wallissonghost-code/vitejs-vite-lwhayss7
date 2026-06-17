import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Gift,
  Heart,
  Home,
  Inbox,
  MessageCircle,
  Music2,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  UploadCloud,
  User,
  X
} from "lucide-react";

type CommentItem = {
  id: number;
  user: string;
  name: string;
  avatar: string;
  text: string;
  createdAt: string;
};

type VideoPost = {
  id: number;
  user: string;
  name: string;
  avatar: string;
  videoUrl: string;
  caption: string;
  music: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  gifts: number;
  verified: boolean;
  following: boolean;
  commentList: CommentItem[];
};

type CreatorProfile = {
  user: string;
  name: string;
  bio: string;
  avatar: string;
  coins: number;
  followers: number;
};

type Tab = "home" | "search" | "inbox" | "profile";

type GiftOption = {
  id: string;
  name: string;
  emoji: string;
  coins: number;
};

const API = "/api";

const gifts: GiftOption[] = [
  { id: "rose", name: "Rosa", emoji: "🌹", coins: 5 },
  { id: "fire", name: "Fogo", emoji: "🔥", coins: 15 },
  { id: "crown", name: "Coroa", emoji: "👑", coins: 50 },
  { id: "diamond", name: "Diamante", emoji: "💎", coins: 100 }
];

const defaultProfile: CreatorProfile = {
  user: "meu.perfil",
  name: "Meu Perfil",
  bio: "Creator GXST Vibes • vídeos curtos, trends, capas e divulgação.",
  avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=wallissonghost",
  coins: 250,
  followers: 1500
};

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Erro na API do GXST Vibes.");
  }
  return data as T;
}

export default function App() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [profile, setProfile] = useState<CreatorProfile>(defaultProfile);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [feedMode, setFeedMode] = useState<"following" | "foryou">("foryou");
  const [liked, setLiked] = useState<Record<number, boolean>>(() => loadRecord("gxst-liked", {}));
  const [saved, setSaved] = useState<Record<number, boolean>>(() => loadRecord("gxst-saved", {}));
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [giftVideo, setGiftVideo] = useState<VideoPost | null>(null);
  const [commentVideo, setCommentVideo] = useState<VideoPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    creator: defaultProfile.name,
    user: defaultProfile.user,
    caption: "",
    music: "Som original - Meu Perfil",
    videoUrl: ""
  });

  useEffect(() => {
    localStorage.setItem("gxst-liked", JSON.stringify(liked));
  }, [liked]);

  useEffect(() => {
    localStorage.setItem("gxst-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    setForm((current) => ({ ...current, creator: profile.name, user: profile.user }));
  }, [profile.name, profile.user]);

  useEffect(() => {
    loadAppData();
  }, []);

  async function loadAppData() {
    setLoading(true);
    setError("");
    try {
      const [apiVideos, apiProfile] = await Promise.all([
        apiJson<VideoPost[]>(`${API}/videos`),
        apiJson<CreatorProfile>(`${API}/profile`)
      ]);
      setVideos(apiVideos);
      setProfile(apiProfile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao carregar app.");
    } finally {
      setLoading(false);
    }
  }

  function replaceVideo(updated: VideoPost) {
    setVideos((current) => current.map((video) => (video.id === updated.id ? updated : video)));
    setCommentVideo((current) => (current?.id === updated.id ? updated : current));
    setGiftVideo((current) => (current?.id === updated.id ? updated : current));
  }

  const visibleVideos = useMemo(() => {
    if (feedMode === "following") {
      const following = videos.filter((video) => video.following);
      return following.length ? following : videos;
    }
    return videos;
  }, [feedMode, videos]);

  const filteredVideos = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return videos;
    return videos.filter((video) => {
      const searchable = [video.user, video.name, video.caption, video.music, ...video.tags]
        .join(" ")
        .toLowerCase();
      return searchable.includes(text);
    });
  }, [query, videos]);

  const ranking = useMemo(() => {
    return [...videos].sort((a, b) => scoreVideo(b) - scoreVideo(a)).slice(0, 5);
  }, [videos]);

  const myVideos = videos.filter((video) => video.user === profile.user);
  const totalLikes = myVideos.reduce((sum, video) => sum + video.likes, 0);
  const totalGifts = myVideos.reduce((sum, video) => sum + video.gifts, 0);

  async function toggleLike(id: number) {
    const nextLiked = !liked[id];
    setLiked((current) => ({ ...current, [id]: nextLiked }));
    setVideos((current) =>
      current.map((video) =>
        video.id === id
          ? { ...video, likes: Math.max(0, video.likes + (nextLiked ? 1 : -1)) }
          : video
      )
    );

    try {
      const updated = await apiJson<VideoPost>(`${API}/videos/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: nextLiked })
      });
      replaceVideo(updated);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao curtir.");
    }
  }

  function toggleSave(id: number) {
    setSaved((current) => ({ ...current, [id]: !current[id] }));
  }

  async function toggleFollow(id: number) {
    try {
      const updated = await apiJson<VideoPost>(`${API}/videos/${id}/follow`, { method: "POST" });
      replaceVideo(updated);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao seguir.");
    }
  }

  async function shareVideo(video: VideoPost) {
    try {
      const updated = await apiJson<VideoPost>(`${API}/videos/${video.id}/share`, { method: "POST" });
      replaceVideo(updated);
    } catch {
      return;
    }

    const text = `Olha esse vídeo do @${video.user} no GXST Vibes: ${video.caption}`;
    try {
      if (navigator.share) await navigator.share({ title: "GXST Vibes", text });
      else {
        await navigator.clipboard.writeText(text);
        alert("Texto copiado para compartilhar.");
      }
    } catch {
      return;
    }
  }

  async function publishVideo() {
    const caption = form.caption.trim();
    if (!caption) {
      alert("Escreva uma legenda para publicar.");
      return;
    }

    const body = new FormData();
    body.append("creator", form.creator);
    body.append("user", form.user);
    body.append("caption", caption);
    body.append("music", form.music);
    body.append("videoUrl", form.videoUrl);
    if (selectedVideoFile) body.append("video", selectedVideoFile);

    try {
      const created = await apiJson<VideoPost>(`${API}/videos`, {
        method: "POST",
        body
      });
      setVideos((current) => [created, ...current]);
      setForm({
        creator: profile.name,
        user: profile.user,
        caption: "",
        music: "Som original - Meu Perfil",
        videoUrl: ""
      });
      setSelectedVideoUrl("");
      setSelectedVideoFile(null);
      setUploadOpen(false);
      setActiveTab("home");
      setFeedMode("foryou");
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao publicar vídeo.");
    }
  }

  async function addComment() {
    if (!commentVideo || !commentText.trim()) return;
    try {
      const response = await apiJson<{ video: VideoPost; comment: CommentItem }>(
        `${API}/videos/${commentVideo.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: commentText.trim() })
        }
      );
      replaceVideo(response.video);
      setCommentText("");
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao comentar.");
    }
  }

  async function sendGift(gift: GiftOption) {
    if (!giftVideo) return;
    try {
      const response = await apiJson<{ profile: CreatorProfile; video: VideoPost }>(
        `${API}/videos/${giftVideo.id}/gift`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftId: gift.id })
        }
      );
      setProfile(response.profile);
      replaceVideo(response.video);
      setGiftVideo(null);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao enviar presente.");
    }
  }

  async function rechargeWallet() {
    try {
      const updated = await apiJson<CreatorProfile>(`${API}/wallet/recharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100 })
      });
      setProfile(updated);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao recarregar carteira.");
    }
  }

  async function saveProfile() {
    try {
      const cleanProfile = {
        ...profile,
        user: profile.user.trim().replace("@", "") || "meu.perfil",
        name: profile.name.trim() || "Meu Perfil",
        bio: profile.bio.trim() || defaultProfile.bio
      };
      const updated = await apiJson<CreatorProfile>(`${API}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanProfile)
      });
      setProfile(updated);
      setEditProfileOpen(false);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Erro ao salvar perfil.");
    }
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;
    if (selectedVideoUrl.startsWith("blob:")) URL.revokeObjectURL(selectedVideoUrl);
    setSelectedVideoFile(file);
    setSelectedVideoUrl(URL.createObjectURL(file));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className={feedMode === "following" ? "top-link active" : "top-link"}
          onClick={() => {
            setFeedMode("following");
            setActiveTab("home");
          }}
        >
          Seguindo
        </button>
        <button
          className={feedMode === "foryou" ? "top-link active" : "top-link"}
          onClick={() => {
            setFeedMode("foryou");
            setActiveTab("home");
          }}
        >
          Para você
        </button>
      </header>

      {loading && (
        <section className="page center-page">
          <h1>Carregando GXST Vibes...</h1>
          <p>Conectando ao backend.</p>
        </section>
      )}

      {!loading && error && (
        <section className="page center-page">
          <h1>Backend não respondeu</h1>
          <p>{error}</p>
          <button className="primary-wide" onClick={loadAppData}>
            Tentar novamente
          </button>
        </section>
      )}

      {!loading && !error && activeTab === "home" && (
        <main className="feed">
          {visibleVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              liked={!!liked[video.id]}
              saved={!!saved[video.id]}
              onLike={() => toggleLike(video.id)}
              onSave={() => toggleSave(video.id)}
              onFollow={() => toggleFollow(video.id)}
              onComment={() => setCommentVideo(video)}
              onGift={() => setGiftVideo(video)}
              onShare={() => shareVideo(video)}
            />
          ))}
        </main>
      )}

      {!loading && !error && activeTab === "search" && (
        <section className="page search-page">
          <div className="page-header">
            <div>
              <span className="eyebrow">Explorar</span>
              <h1>Buscar vídeos</h1>
            </div>
            <Sparkles />
          </div>

          <label className="search-box">
            <Search size={20} />
            <input
              placeholder="Buscar perfil, legenda, música ou hashtag..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="trend-list">
            {["#gxst", "#viral", "#modelo", "#ranking", "#creator"].map((tag) => (
              <button key={tag} onClick={() => setQuery(tag.replace("#", ""))}>
                <Flame size={16} />
                {tag}
              </button>
            ))}
          </div>

          <div className="ranking-card">
            <div className="ranking-title">
              <Trophy size={20} />
              <strong>Ranking de criadores</strong>
            </div>
            {ranking.map((video, index) => (
              <button
                className="ranking-row"
                key={video.id}
                onClick={() => {
                  setActiveTab("home");
                  setFeedMode("foryou");
                }}
              >
                <span className="rank-position">#{index + 1}</span>
                <img src={video.avatar} alt={video.name} />
                <div>
                  <strong>@{video.user}</strong>
                  <small>{formatNumber(scoreVideo(video))} pontos</small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>

          <div className="grid-results">
            {filteredVideos.map((video) => (
              <button
                className="result-card"
                key={video.id}
                onClick={() => {
                  setActiveTab("home");
                  setFeedMode("foryou");
                }}
              >
                <video src={video.videoUrl} muted loop playsInline />
                <span>@{video.user}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && activeTab === "inbox" && (
        <section className="page inbox-page">
          <div className="page-header">
            <div>
              <span className="eyebrow">Atividade</span>
              <h1>Inbox</h1>
            </div>
            <Bell />
          </div>

          <Notification icon={<Heart />} title="Curtidas chegando" text="Seus vídeos somam novas curtidas no ranking." />
          <Notification icon={<Gift />} title="Presentes ativados" text="Criadores agora podem receber rosas, coroas e diamantes." />
          <Notification icon={<TrendingUp />} title="Backend conectado" text="Agora vídeos, comentários, perfil e moedas usam API real." />
        </section>
      )}

      {!loading && !error && activeTab === "profile" && (
        <section className="page profile-page">
          <div className="profile-cover"></div>
          <img className="profile-avatar" src={profile.avatar} alt={profile.name} />
          <h1>@{profile.user}</h1>
          <p>{profile.bio}</p>

          <div className="wallet-card">
            <div>
              <span>Carteira</span>
              <strong>{profile.coins} moedas</strong>
            </div>
            <button onClick={rechargeWallet}>+100 fake</button>
          </div>

          <div className="profile-stats">
            <div>
              <strong>{myVideos.length}</strong>
              <span>Vídeos</span>
            </div>
            <div>
              <strong>{formatNumber(profile.followers)}</strong>
              <span>Seguidores</span>
            </div>
            <div>
              <strong>{formatNumber(totalLikes + totalGifts)}</strong>
              <span>Pontos</span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="primary-wide" onClick={() => setUploadOpen(true)}>
              Publicar vídeo
              <ChevronRight size={18} />
            </button>
            <button className="secondary-wide" onClick={() => setEditProfileOpen(true)}>
              Editar perfil
              <User size={18} />
            </button>
          </div>

          <div className="profile-grid">
            {videos.slice(0, 6).map((video) => (
              <video key={video.id} src={video.videoUrl} muted loop playsInline />
            ))}
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        <NavButton active={activeTab === "home"} icon={<Home />} label="Início" onClick={() => setActiveTab("home")} />
        <NavButton active={activeTab === "search"} icon={<Search />} label="Buscar" onClick={() => setActiveTab("search")} />
        <button className="create-button" onClick={() => setUploadOpen(true)} aria-label="Publicar">
          <Plus />
        </button>
        <NavButton active={activeTab === "inbox"} icon={<Inbox />} label="Inbox" onClick={() => setActiveTab("inbox")} />
        <NavButton active={activeTab === "profile"} icon={<User />} label="Perfil" onClick={() => setActiveTab("profile")} />
      </nav>

      {uploadOpen && (
        <div className="modal-backdrop">
          <section className="modal-card">
            <button className="modal-close" onClick={() => setUploadOpen(false)} aria-label="Fechar">
              <X />
            </button>
            <div className="modal-icon">
              <UploadCloud />
            </div>
            <h2>Publicar vídeo</h2>
            <p>Escolha um vídeo do aparelho ou cole uma URL .mp4. O arquivo vai para a pasta uploads.</p>

            <label className="file-picker">
              <UploadCloud size={19} />
              <span>{selectedVideoFile ? selectedVideoFile.name : "Selecionar vídeo do aparelho"}</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => handleVideoFile(event.target.files?.[0])}
              />
            </label>

            {selectedVideoUrl && <video className="upload-preview" src={selectedVideoUrl} controls />}

            <input
              placeholder="Nome do criador"
              value={form.creator}
              onChange={(event) => setForm({ ...form, creator: event.target.value })}
            />
            <input
              placeholder="Usuário, ex: ghost.creator"
              value={form.user}
              onChange={(event) => setForm({ ...form, user: event.target.value })}
            />
            <input
              placeholder="URL do vídeo .mp4 opcional"
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />
            <input
              placeholder="Música / áudio"
              value={form.music}
              onChange={(event) => setForm({ ...form, music: event.target.value })}
            />
            <textarea
              placeholder="Legenda do vídeo... use #hashtags"
              value={form.caption}
              onChange={(event) => setForm({ ...form, caption: event.target.value })}
            />

            <button className="primary-wide" onClick={publishVideo}>
              Publicar agora
              <Send size={18} />
            </button>
          </section>
        </div>
      )}

      {editProfileOpen && (
        <div className="modal-backdrop">
          <section className="modal-card">
            <button className="modal-close" onClick={() => setEditProfileOpen(false)} aria-label="Fechar">
              <X />
            </button>
            <div className="modal-icon">
              <Crown />
            </div>
            <h2>Editar perfil</h2>
            <p>Essas informações agora são salvas no backend JSON do projeto.</p>
            <input
              placeholder="Nome"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
            <input
              placeholder="Usuário"
              value={profile.user}
              onChange={(event) => setProfile({ ...profile, user: event.target.value })}
            />
            <textarea
              placeholder="Bio"
              value={profile.bio}
              onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            />
            <button className="primary-wide" onClick={saveProfile}>
              Salvar perfil
              <CheckCircle2 size={18} />
            </button>
          </section>
        </div>
      )}

      {giftVideo && (
        <div className="modal-backdrop">
          <section className="modal-card gift-modal">
            <button className="modal-close" onClick={() => setGiftVideo(null)} aria-label="Fechar">
              <X />
            </button>
            <div className="modal-icon">
              <Gift />
            </div>
            <h2>Enviar presente</h2>
            <p>
              Saldo atual: <strong>{profile.coins} moedas</strong>. Presentes aumentam os pontos do criador.
            </p>
            <div className="gift-grid">
              {gifts.map((gift) => (
                <button key={gift.id} onClick={() => sendGift(gift)}>
                  <span>{gift.emoji}</span>
                  <strong>{gift.name}</strong>
                  <small>{gift.coins} moedas</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {commentVideo && (
        <div className="comment-drawer">
          <div className="comment-header">
            <strong>Comentários</strong>
            <button onClick={() => setCommentVideo(null)}>
              <X />
            </button>
          </div>

          <div className="comment-list">
            {commentVideo.commentList.length === 0 && (
              <p className="empty-text">Seja o primeiro a comentar nesse vídeo.</p>
            )}
            {commentVideo.commentList.map((comment) => (
              <div className="comment-item" key={comment.id}>
                <img src={comment.avatar} alt={comment.name} />
                <div>
                  <strong>@{comment.user}</strong>
                  <p>{comment.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="comment-input">
            <input
              placeholder="Adicionar comentário..."
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addComment();
              }}
            />
            <button onClick={addComment}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({
  video,
  liked,
  saved,
  onLike,
  onSave,
  onFollow,
  onComment,
  onGift,
  onShare
}: {
  video: VideoPost;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onComment: () => void;
  onGift: () => void;
  onShare: () => void;
}) {
  return (
    <article className="video-card">
      <video className="video-bg" src={video.videoUrl} autoPlay muted loop playsInline />
      <div className="shade"></div>

      <div className="video-content">
        <div className="creator-row">
          <img src={video.avatar} alt={video.name} />
          <div>
            <strong>
              @{video.user}
              {video.verified && <CheckCircle2 size={15} />}
            </strong>
            <span>{video.name}</span>
          </div>
          <button className={video.following ? "follow-btn following" : "follow-btn"} onClick={onFollow}>
            {video.following ? "Seguindo" : "Seguir"}
          </button>
        </div>

        <p className="caption">{video.caption}</p>
        <div className="tag-row">
          {video.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <div className="music-row">
          <Music2 size={16} />
          <span>{video.music}</span>
        </div>
      </div>

      <aside className="action-stack">
        <ActionButton active={liked} icon={<Heart />} label={formatNumber(video.likes)} onClick={onLike} />
        <ActionButton icon={<MessageCircle />} label={formatNumber(video.comments)} onClick={onComment} />
        <ActionButton icon={<Gift />} label={formatNumber(video.gifts)} onClick={onGift} />
        <ActionButton icon={<Share2 />} label={formatNumber(video.shares)} onClick={onShare} />
        <ActionButton active={saved} icon={<Bookmark />} label="Salvar" onClick={onSave} />
        <div className="disc">
          <Music2 size={18} />
        </div>
      </aside>
    </article>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onClick
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? "action-button active" : "action-button"} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Notification({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="notification-card">
      <div className="notification-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <ChevronRight size={18} />
    </div>
  );
}

function loadRecord<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function scoreVideo(video: VideoPost) {
  return video.likes + video.comments * 2 + video.shares * 4 + video.gifts * 5;
}

function formatNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
