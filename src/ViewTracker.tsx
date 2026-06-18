import { useEffect } from "react";

type VideoItem = {
  id: number;
  videoUrl: string;
};

const TOKEN_KEY = "gxst-token";
const VISITOR_KEY = "gxst-visitor-id";
const SENT_PREFIX = "gxst-view-sent-";

function visitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const created = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(VISITOR_KEY, created);
  return created;
}

function normalizeUrl(value = "") {
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
}

function pageSource() {
  if (window.location.pathname.startsWith("/@")) return "creator_page";
  if (window.location.hash.startsWith("#/@")) return "profile_modal";
  return "feed";
}

export function ViewTracker() {
  useEffect(() => {
    const sent = new Set<number>();
    const timers = new WeakMap<HTMLVideoElement, number>();
    let videoMap = new Map<string, number>();
    let observer: IntersectionObserver | null = null;

    async function loadVideoMap() {
      try {
        const token = localStorage.getItem(TOKEN_KEY) || "";
        const response = await fetch("/api/videos", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const videos = (await response.json()) as VideoItem[];
        videoMap = new Map(videos.map((video) => [normalizeUrl(video.videoUrl), video.id]));
      } catch {
        videoMap = new Map();
      }
    }

    function idForElement(video: HTMLVideoElement) {
      const candidates = [
        video.currentSrc,
        video.src,
        video.getAttribute("src") || "",
        video.querySelector("source")?.getAttribute("src") || ""
      ].map(normalizeUrl);

      for (const candidate of candidates) {
        const id = videoMap.get(candidate);
        if (id) return id;
      }
      return 0;
    }

    async function sendView(videoId: number, watchMs = 2000) {
      if (!videoId || sent.has(videoId)) return;
      if (sessionStorage.getItem(`${SENT_PREFIX}${videoId}`)) return;
      sent.add(videoId);
      sessionStorage.setItem(`${SENT_PREFIX}${videoId}`, "1");

      const token = localStorage.getItem(TOKEN_KEY) || "";
      await fetch(`/api/videos/${videoId}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gxst-visitor": visitorId(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ visitorId: visitorId(), source: pageSource(), watchMs })
      }).catch(() => {});
    }

    function observeVideos() {
      if (!observer) return;
      document.querySelectorAll("video").forEach((video) => {
        const element = video as HTMLVideoElement;
        if (element.dataset.gxstViewTracked === "1") return;
        element.dataset.gxstViewTracked = "1";
        element.addEventListener("play", () => sendView(idForElement(element), Math.floor(element.currentTime * 1000 || 2000)), { passive: true });
        observer.observe(element);
      });
    }

    async function boot() {
      await loadVideoMap();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const previous = timers.get(video);
          if (previous) window.clearTimeout(previous);

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const timer = window.setTimeout(() => sendView(idForElement(video), 2500), 2500);
            timers.set(video, timer);
          }
        });
      }, { threshold: [0, 0.55, 0.8] });

      observeVideos();
    }

    boot();
    const scanTimer = window.setInterval(observeVideos, 3000);
    const mapTimer = window.setInterval(loadVideoMap, 15000);

    return () => {
      window.clearInterval(scanTimer);
      window.clearInterval(mapTimer);
      observer?.disconnect();
    };
  }, []);

  return null;
}
