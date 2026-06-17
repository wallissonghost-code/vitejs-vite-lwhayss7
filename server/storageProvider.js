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
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "video";
}

function fileExtension(file) {
  const originalExt = path.extname(file?.originalname || "").toLowerCase();
  return VIDEO_EXTENSIONS.has(originalExt) ? originalExt : ".mp4";
}

function makeFileName(file) {
  const ext = fileExtension(file);
  const base = cleanBaseName(path.basename(file?.originalname || "video", ext));
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}-${base}${ext}`;
}

function assertVideo(file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimeOk = String(file.mimetype || "").startsWith("video/");
  const extOk = VIDEO_EXTENSIONS.has(ext);
  if (mimeOk || extOk) return cb(null, true);
  cb(new Error("Envie apenas arquivos de vídeo."));
}

function resolveUploadsDir(rootDir) {
  const configured = process.env.UPLOADS_DIR || "uploads";
  return path.isAbsolute(configured) ? configured : path.join(rootDir, configured);
}

function normalizeBaseUrl(value = "") {
  return String(value || "").trim().replace(/\/$/, "");
}

function requireSupabaseConfig() {
  const supabaseUrl = normalizeBaseUrl(process.env.SUPABASE_URL);
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  const bucket = String(process.env.SUPABASE_BUCKET || "gxst-videos").trim();

  if (!supabaseUrl) throw new Error("Configure SUPABASE_URL para usar storage Supabase.");
  if (!serviceKey) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY para usar storage Supabase.");
  if (!bucket) throw new Error("Configure SUPABASE_BUCKET para usar storage Supabase.");

  return { supabaseUrl, serviceKey, bucket };
}

async function uploadToSupabase(file) {
  const { supabaseUrl, serviceKey, bucket } = requireSupabaseConfig();
  const folder = cleanBaseName(process.env.SUPABASE_FOLDER || "videos");
  const objectName = `${folder}/${makeFileName(file)}`;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(objectName).replace(/%2F/g, "/")}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": file.mimetype || "video/mp4",
      "x-upsert": "false"
    },
    body: file.buffer
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao enviar vídeo para Supabase: ${response.status} ${text}`.trim());
  }

  const publicBase = normalizeBaseUrl(process.env.PUBLIC_UPLOAD_BASE_URL);
  if (publicBase) return `${publicBase}/${objectName}`;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectName}`;
}

export function createStorageProvider(rootDir) {
  const driver = String(process.env.STORAGE_DRIVER || "local").toLowerCase();
  const maxUploadMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 200));

  if (driver === "supabase") {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: maxUploadMb * 1024 * 1024 },
      fileFilter: (_req, file, cb) => assertVideo(file, cb)
    });

    return {
      driver,
      upload,
      async saveFile(file) {
        if (!file) return "";
        return uploadToSupabase(file);
      },
      config: {
        driver,
        maxUploadMb,
        bucket: process.env.SUPABASE_BUCKET || "gxst-videos",
        folder: process.env.SUPABASE_FOLDER || "videos"
      }
    };
  }

  const uploadsDir = resolveUploadsDir(rootDir);
  const publicUploadBaseUrl = normalizeBaseUrl(process.env.PUBLIC_UPLOAD_BASE_URL);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, makeFileName(file))
  });

  const upload = multer({
    storage,
    limits: { fileSize: maxUploadMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => assertVideo(file, cb)
  });

  return {
    driver: "local",
    upload,
    async saveFile(file) {
      if (!file?.filename) return "";
      const localPath = `/uploads/${file.filename}`;
      return publicUploadBaseUrl ? `${publicUploadBaseUrl}${localPath}` : localPath;
    },
    config: {
      driver: "local",
      maxUploadMb,
      uploadsDir,
      publicUploadBaseUrl: publicUploadBaseUrl || "local"
    }
  };
}
