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

const gifts: GiftOption[] = [
  { id: "rose", name: "Rosa", emoji: "🌹", coins: 5 },
  { id: "fire", name: "Fogo", emoji: "🔥", coins: 15 },
  { id: "crown", name: "Coroa", emoji: "👑", coins: 50 },
  { id: "diamond", name: "Diamante", emoji: "💎", coins: 100 }
];

const seedVideos: VideoPost[] = [
  {
    id: 1,
    user: "gxst.vibes",
    name: "GXST Vibes Oficial",
    avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=gxst",
    videoUrl:
      "https://videos.pexels.com/video-files/853789/853789-hd_720_1280_25fps.mp4",
    caption: "Bem-vindo ao GXST Vibes: vídeos curtos, trends, ranking e criadores em destaque. #gxst #viral",
    music: "Som original - GXST Vibes",
    tags: ["gxst", "viral", "shorts"],
    likes: 12890,
    comments: 342,
    shares: 118,
    gifts: 740,
    verified: true,
    following: false
  },
  {
    id: 2,
    user: "modelo.fx",
    name: "Modelo FX",
    avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=modelofx",
    videoUrl:
      "https://videos.pexels.com/video-files/2792370/2792370-hd_720_1280_30fps.mp4",
    caption: "Ensaio premium com estética urbana para capa digital. #modelo #fx",
    music: "Trend premium - FX Studio",
    tags: ["modelo", "fx", "capa"],
    likes: 8420,
    comments: 219,
    shares: 77,
    gifts: 320,
    verified: false,
    following: true
  },
  {
    id: 3,
    user: "ghost.creator",
    name: "Ghost Creator",
    avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=ghostcreator",
    videoUrl:
      "https://videos.pexels.com/video-files/3571264/3571264-hd_720_1280_30fps.mp4",
    caption: "Criador em destaque da semana. Poste, cresça e entre no ranking. #creator #ranking",
    music: "Beat exclusivo - Ghost",
    tags: ["creator", "ranking", "vibes"],
    likes: 3960,
    comments: 144,
    shares: 61,
    gifts: 190,
    verified: true,
    following: false
  }
];

const sampleVideoUrls = seedVideos.map((video) => video.videoUrl);

const defaultUser: CreatorProfile = {
  user: "meu.perfil",
  name: "Meu Perfil",
  bio: "Creator GXST Vibes • vídeos curtos, trends, capas e divulgação.",
  avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=wallissonghost",
  coins: 250,
  followers: 1500
};

function loadVideos() {
  try {
    const saved = localStorage.getItem("gxst-videos");
    if (!saved) return seedVideos;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : seedVideos;
  } catch {
    return seedVideos;
  }
}

function loadRecord<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [videos, setVideos] = useState<VideoPost[]>(loadVideos);
  const [profile, setProfile] = useState<CreatorProfile>(() =>
    loadRecord("gxst-profile", defaultUser)
  );
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [feedMode, setFeedMode] = useState<"following" | "foryou">("foryou");
  const [liked, setLiked] = useState<Record<number, boolean>>(() =>
    loadRecord("gxst-liked", {})
  );
  const [saved, setSaved] = useState<Record<number, boolean>>(() =>
    loadRecord("gxst-saved", {})
  );
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [giftVideo, setGiftVideo] = useState<VideoPost | null>(null);
  const [commentVideo, setCommentVideo] = useState<VideoPost | null>(null);
  const [comments, setComments] = useState<Record<number, string[]>>(() =>
    loadRecord("gxst-comments", {})
  );
  const [commentText, setCommentText] = useState("");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [form, setForm] = useState({
    creator: defaultUser.name,
    user: defaultUser.user,
    caption: "",
    music: "Som original - Meu Perfil",
    videoUrl: ""
  });

  useEffect(() => {
    const persistable = videos.map((video) =>
      video.videoUrl.startsWith("blob:")
        ? { ...video, videoUrl: sampleVideoUrls[0] }
        : video
    );
    localStorage.setItem("gxst-videos", JSON.stringify(persistable));
  }, [videos]);

  useEffect(() => {
    localStorage.setItem("gxst-profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("gxst-liked", JSON.stringify(liked));
  }, [liked]);

  useEffect(() => {
    localStorage.setItem("gxst-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem("gxst-comments", JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    setForm((current) => ({ ...current, creator: profile.name, user: profile.user }));
  }, [profile.name, profile.user]);

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
      const searchable = [
        video.user,
        video.name,
        video.caption,
        video.music,
        ...video.tags
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(text);
    });
  }, [query, videos]);

  const ranking = useMemo(() => {
    return [...videos]
      .sort((a, b) => scoreVideo(b) - scoreVideo(a))
      .slice(0, 5);
  }, [videos]);

  const myVideos = videos.filter((video) => video.user === profile.user);
  const totalLikes = myVideos.reduce((sum, video) => sum + video.likes, 0);
  const totalGifts = myVideos.reduce((sum, video) => sum + video.gifts, 0);

  function toggleLike(id: number) {
    const nextLiked = !liked[id];
    setLiked((current) => ({ ...current, [id]: nextLiked }));
    setVideos((current) =>
      current.map((video) =>
        video.id === id
          ? { ...video, likes: Math.max(0, video.likes + (nextLiked ? 1 : -1)) }
          : video
      )
    );
  }

  function toggleSave(id: number) {
    setSaved((current) => ({ ...current, [id]: !current[id] }));
  }

  function toggleFollow(id: number) {
    setVideos((current) =>
      current.map((video) =>
        video.id === id ? { ...video, following: !video.following } : video
      )
    );
  }

  async function shareVideo(video: VideoPost) {
    setVideos((current) =>
      current.map((item) =>
        item.id === video.id ? { ...item, shares: item.shares + 1 } : item
      )
    );

    const text = `Olha esse vídeo do @${video.user} no GXST Vibes: ${video.caption}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "GXST Vibes", text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Texto copiado para compartilhar.");
      }
    } catch {
      return;
    }
  }

  function publishVideo() {
    const caption = form.caption.trim();
    if (!caption) {
      alert("Escreva uma legenda para publicar.");
      return;
    }

    const videoUrl =
      selectedVideoUrl ||
      form.videoUrl.trim() ||
      sampleVideoUrls[Math.floor(Math.random() * sampleVideoUrls.length)];

    const cleanUser = form.user.trim().replace("@", "") || profile.user;
    const nextVideo: VideoPost = {
      id: Date.now(),
      user: cleanUser,
      name: form.creator.trim() || profile.name,
      avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`,
      videoUrl,
      caption,
      music: form.music.trim() || "Som original - Meu Perfil",
      tags: extractTags(caption),
      likes: 0,
      comments: 0,
      shares: 0,
      gifts: 0,
      verified: false,
      following: false
    };

    setVideos((current) => [nextVideo, ...current]);
    setForm({
      creator: profile.name,
      user: profile.user,
      caption: "",
      music: "Som original - Meu Perfil",
      videoUrl: ""
    });
    setSelectedVideoUrl("");
    setUploadOpen(false);
    setActiveTab("home");
    setFeedMode("foryou");
  }

  function addComment() {
    if (!commentVideo || !commentText.trim()) return;
    const text = commentText.trim();
    setComments((current) => ({
      ...current,
      [commentVideo.id]: [text, ...(current[commentVideo.id] || [])]
    }));
    setVideos((current) =>
      current.map((video) =>
        video.id === commentVideo.id ? { ...video, comments: video.comments + 1 } : video
      )
    );
    setCommentText("");
  }

  function sendGift(gift: GiftOption) {
    if (!giftVideo) return;
    if (profile.coins < gift.coins) {
      alert("Você não tem moedas suficientes. Use o botão de recarga fake na carteira.");
      return;
    }

    setProfile((current) => ({ ...current, coins: current.coins - gift.coins }));
    setVideos((current) =>
      current.map((video) =>
        video.id === giftVideo.id
          ? { ...video, gifts: video.gifts + gift.coins, likes: video.likes + 1 }
          : video
      )
    );
    setGiftVideo(null);
  }

  function saveProfile() {
    const cleanUser = profile.user.trim().replace("@", "") || "meu.perfil";
    setProfile((current) => ({
      ...current,
      user: cleanUser,
      name: current.name.trim() || "Meu Perfil",
      bio: current.bio.trim() || defaultUser.bio,
      avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`
    }));
    setEditProfileOpen(false);
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

      {activeTab === "home" && (
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

      {activeTab === "search" && (
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

      {activeTab === "inbox" && (
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
          <Notification icon={<TrendingUp />} title="Trend em alta" text="A hashtag #gxst está crescendo hoje." />
        </section>
      )}

      {activeTab === "profile" && (
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
            <button onClick={() => setProfile((current) => ({ ...current, coins: current.coins + 100 }))}>
              +100 fake
            </button>
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
            <p>Escolha um vídeo do aparelho ou cole uma URL .mp4. Sem vídeo, o app usa um exemplo.</p>

            <label className="file-picker">
              <UploadCloud size={19} />
              <span>{selectedVideoUrl ? "Vídeo selecionado" : "Selecionar vídeo do aparelho"}</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setSelectedVideoUrl(URL.createObjectURL(file));
                }}
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
            <p>Essas informações ficam salvas no navegador enquanto a V2 não tem banco de dados.</p>
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
            {(comments[commentVideo.id] || []).length === 0 && (
              <p className="empty-text">Seja o primeiro a comentar nesse vídeo.</p>
            )}
            {(comments[commentVideo.id] || []).map((comment, index) => (
              <div className="comment-item" key={`${comment}-${index}`}>
                <img src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${index}`} alt="Comentário" />
                <div>
                  <strong>@usuario{index + 1}</strong>
                  <p>{comment}</p>
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

function extractTags(text: string) {
  const found = text.match(/#[a-zA-Z0-9_À-ÿ]+/g) || [];
  const tags = found.map((tag) => tag.replace("#", "").toLowerCase());
  return tags.length ? tags.slice(0, 4) : ["gxst", "vibes"];
}

function scoreVideo(video: VideoPost) {
  return video.likes + video.comments * 2 + video.shares * 4 + video.gifts * 5;
}

function formatNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
