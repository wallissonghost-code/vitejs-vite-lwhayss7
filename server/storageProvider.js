import multer from "multer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

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

function makeFileName(file, forceExt = "") {
  const ext = forceExt || fileExtension(file);
  const base = cleanBaseName(path.basename(file?.originalname || "video", path.extname(file?.originalname || "")));
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

function shouldProcessVideos() {
  const mode = String(process.env.VIDEO_PROCESSING || "auto").toLowerCase();
  return !["off", "false", "0", "disabled"].includes(mode);
}

function ffmpegBin() {
  return process.env.FFMPEG_BIN || "ffmpeg";
}

function runFfmpeg(inputPath, outputPath) {
  const timeoutMs = Math.max(15000, Number(process.env.FFMPEG_TIMEOUT_MS || 180000));
  const args = [
    "-y",
    "-i",
    inputPath,
    "-vf",
    process.env.VIDEO_SCALE || "scale=720:-2",
    "-c:v",
    "libx264",
    "-preset",
    process.env.FFMPEG_PRESET || "veryfast",
    "-crf",
    String(process.env.VIDEO_CRF || 28),
    "-c:a",
    "aac",
    "-b:a",
    process.env.AUDIO_BITRATE || "96k",
    "-movflags",
    "+faststart",
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorLog = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Tempo limite ao converter vídeo."));
    }, timeoutMs);

    child.stderr.on("data", (chunk) => {
      errorLog = `${errorLog}${chunk}`.slice(-3000);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(outputPath);
      reject(new Error(errorLog || `ffmpeg finalizou com código ${code}`));
    });
  });
}

async function convertLocalFile(inputPath, outputPath) {
  if (!shouldProcessVideos()) return null;
  try {
    await runFfmpeg(inputPath, outputPath);
    const stat = await fs.promises.stat(outputPath);
    return stat.size > 0 ? outputPath : null;
  } catch (error) {
    console.warn("[GXST] Conversão de vídeo ignorada:", error.message);
    return null;
  }
}

async function fileToProcessedBuffer(file) {
  if (!shouldProcessVideos() || !file?.buffer) return file;
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gxst-video-"));
  const inputPath = path.join(tempDir, makeFileName(file));
  const outputPath = path.join(tempDir, makeFileName(file, ".mp4"));

  try {
    await fs.promises.writeFile(inputPath, file.buffer);
    const convertedPath = await convertLocalFile(inputPath, outputPath);
    if (!convertedPath) return file;
    const buffer = await fs.promises.readFile(convertedPath);
    return {
      ...file,
      buffer,
      originalname: path.basename(outputPath),
      mimetype: "video/mp4"
    };
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
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
  const processedFile = await fileToProcessedBuffer(file);
  const { supabaseUrl, serviceKey, bucket } = requireSupabaseConfig();
  const folder = cleanBaseName(process.env.SUPABASE_FOLDER || "videos");
  const objectName = `${folder}/${makeFileName(processedFile)}`;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(objectName).replace(/%2F/g, "/")}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": processedFile.mimetype || "video/mp4",
      "x-upsert": "false"
    },
    body: processedFile.buffer
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
  const videoProcessing = shouldProcessVideos() ? "auto" : "off";

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
        videoProcessing,
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
      const convertedName = makeFileName(file, ".mp4");
      const convertedPath = path.join(uploadsDir, convertedName);
      const processedPath = await convertLocalFile(file.path, convertedPath);
      const finalName = processedPath ? convertedName : file.filename;
      if (processedPath && file.path !== processedPath) fs.promises.rm(file.path, { force: true }).catch(() => {});
      const localPath = `/uploads/${finalName}`;
      return publicUploadBaseUrl ? `${publicUploadBaseUrl}${localPath}` : localPath;
    },
    config: {
      driver: "local",
      maxUploadMb,
      videoProcessing,
      uploadsDir,
      publicUploadBaseUrl: publicUploadBaseUrl || "local"
    }
  };
}
