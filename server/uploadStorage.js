import multer from "multer";
import fs from "node:fs";
import path from "node:path";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"]);

function cleanBaseName(name = "video") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "video";
}

function resolveUploadsDir(rootDir) {
  const configured = process.env.UPLOADS_DIR || "uploads";
  return path.isAbsolute(configured) ? configured : path.join(rootDir, configured);
}

function normalizePublicBase() {
  return String(process.env.PUBLIC_UPLOAD_BASE_URL || "").trim().replace(/\/$/, "");
}

export function createVideoUploader(rootDir) {
  const uploadsDir = resolveUploadsDir(rootDir);
  const maxUploadMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 200));
  const publicUploadBaseUrl = normalizePublicBase();

  fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const originalExt = path.extname(file.originalname || "").toLowerCase();
      const ext = VIDEO_EXTENSIONS.has(originalExt) ? originalExt : ".mp4";
      const base = cleanBaseName(path.basename(file.originalname || "video", originalExt));
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `${stamp}-${base}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: maxUploadMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const mimeOk = String(file.mimetype || "").startsWith("video/");
      const extOk = VIDEO_EXTENSIONS.has(ext);
      if (mimeOk || extOk) return cb(null, true);
      cb(new Error("Envie apenas arquivos de vídeo."));
    }
  });

  function publicUrlForFile(file) {
    if (!file?.filename) return "";
    const localPath = `/uploads/${file.filename}`;
    return publicUploadBaseUrl ? `${publicUploadBaseUrl}${localPath}` : localPath;
  }

  return {
    upload,
    uploadsDir,
    publicUrlForFile,
    uploadConfig: {
      maxUploadMb,
      uploadsDir,
      publicUploadBaseUrl: publicUploadBaseUrl || "local"
    }
  };
}
