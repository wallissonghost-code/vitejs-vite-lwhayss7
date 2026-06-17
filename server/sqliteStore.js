import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "gxst.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const sqlite = new Database(DB_FILE);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export function toJson(value) {
  return JSON.stringify(value ?? []);
}

export function fromJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeUser(value = "") {
  return String(value)
    .replace("@", "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}
