import fs from "fs";
import path from "path";
import os from "os";
import type { VendorReport, CountyReport } from "./types";

export interface SharedReport {
  id: string;
  type: "vendor" | "county";
  report: VendorReport | CountyReport;
  createdAt: number;
}

const SHARE_TTL = 60 * 60 * 24 * 30; // 30 days

const isRedisConfigured =
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// ── Filesystem fallback ───────────────────────────────────────────────────────
// Persists across Next.js hot reloads and dev server restarts.
// On Vercel, /tmp survives within a warm function instance.
const SHARE_DIR = path.join(os.tmpdir(), "edu-investigator-shares");

function fsEnsureDir(): boolean {
  try {
    if (!fs.existsSync(SHARE_DIR)) fs.mkdirSync(SHARE_DIR, { recursive: true });
    return true;
  } catch { return false; }
}

function fsSave(id: string, data: SharedReport): boolean {
  try {
    if (!fsEnsureDir()) return false;
    fs.writeFileSync(path.join(SHARE_DIR, `${id}.json`), JSON.stringify(data), "utf-8");
    return true;
  } catch { return false; }
}

function fsGet(id: string): SharedReport | null {
  try {
    const p = path.join(SHARE_DIR, `${id}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as SharedReport;
  } catch { return null; }
}

// ── In-memory last-resort ─────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __shareStore: Map<string, SharedReport> | undefined;
}
if (!global.__shareStore) global.__shareStore = new Map();
const memStore = global.__shareStore;

// ── Public API ────────────────────────────────────────────────────────────────

export async function saveSharedReport(id: string, data: SharedReport): Promise<void> {
  if (isRedisConfigured) {
    const redis = await getRedis();
    await redis.set(`share:${id}`, data, { ex: SHARE_TTL });
    return;
  }
  if (!fsSave(id, data)) {
    memStore.set(id, data);
  }
}

export async function getSharedReport(id: string): Promise<SharedReport | null> {
  if (isRedisConfigured) {
    const redis = await getRedis();
    return redis.get<SharedReport>(`share:${id}`);
  }
  return fsGet(id) ?? memStore.get(id) ?? null;
}
