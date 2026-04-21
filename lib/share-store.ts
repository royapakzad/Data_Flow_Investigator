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

declare global {
  // eslint-disable-next-line no-var
  var __shareStore: Map<string, SharedReport> | undefined;
}
if (!global.__shareStore) global.__shareStore = new Map();
const memStore = global.__shareStore;

export async function saveSharedReport(id: string, data: SharedReport): Promise<void> {
  if (isRedisConfigured) {
    const redis = await getRedis();
    await redis.set(`share:${id}`, data, { ex: SHARE_TTL });
  } else {
    memStore.set(id, data);
  }
}

export async function getSharedReport(id: string): Promise<SharedReport | null> {
  if (isRedisConfigured) {
    const redis = await getRedis();
    return redis.get<SharedReport>(`share:${id}`);
  }
  return memStore.get(id) ?? null;
}
