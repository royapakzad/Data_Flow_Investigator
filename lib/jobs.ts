import type { VendorReport } from "./types";

export type JobStatus = "pending" | "running" | "done" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  vendorName: string;
  progress: string[];
  report?: VendorReport;
  error?: string;
  createdAt: number;
}

// True when Upstash Redis env vars are present
export const isRedisConfigured =
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const TTL = 3600;

// ── Redis implementation (production) ────────────────────────────────────────

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function createJobRedis(id: string, vendorName: string): Promise<Job> {
  const redis = await getRedis();
  const job: Job = { id, status: "pending", vendorName, progress: [], createdAt: Date.now() };
  await redis.set(`job:${id}`, job, { ex: TTL });
  return job;
}

async function getJobRedis(id: string): Promise<Job | undefined> {
  const redis = await getRedis();
  const job = await redis.get<Job>(`job:${id}`);
  return job ?? undefined;
}

async function updateJobRedis(id: string, update: Partial<Job>): Promise<void> {
  const redis = await getRedis();
  const job = await redis.get<Job>(`job:${id}`);
  if (job) await redis.set(`job:${id}`, { ...job, ...update }, { ex: TTL });
}

// ── In-memory implementation (fallback / dev) ─────────────────────────────────
// NOTE: only reliable within a single process (dev server or single serverless instance).
// On Vercel multi-instance deployments without Redis, the GET polling will fail.
// In that case the route.ts uses synchronous mode instead of polling.

declare global {
  // eslint-disable-next-line no-var
  var __jobStore: Map<string, Job> | undefined;
}
if (!global.__jobStore) global.__jobStore = new Map<string, Job>();
const memStore = global.__jobStore;

function createJobMem(id: string, vendorName: string): Job {
  const job: Job = { id, status: "pending", vendorName, progress: [], createdAt: Date.now() };
  memStore.set(id, job);
  return job;
}

function getJobMem(id: string): Job | undefined {
  return memStore.get(id);
}

function updateJobMem(id: string, update: Partial<Job>): void {
  const job = memStore.get(id);
  if (job) memStore.set(id, { ...job, ...update });
}

// ── Unified API ───────────────────────────────────────────────────────────────

export async function createJob(id: string, vendorName: string): Promise<Job> {
  if (isRedisConfigured) return createJobRedis(id, vendorName);
  return Promise.resolve(createJobMem(id, vendorName));
}

export async function getJob(id: string): Promise<Job | undefined> {
  if (isRedisConfigured) return getJobRedis(id);
  return Promise.resolve(getJobMem(id));
}

export async function updateJob(id: string, update: Partial<Job>): Promise<void> {
  if (isRedisConfigured) return updateJobRedis(id, update);
  return Promise.resolve(updateJobMem(id, update));
}
