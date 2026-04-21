import type { CountyReport } from "./types";

export type CountyJobStatus = "pending" | "running" | "done" | "error";

export interface CountyJob {
  id: string;
  status: CountyJobStatus;
  countyName: string;
  stateName: string;
  progress: string[];
  report?: CountyReport;
  error?: string;
  createdAt: number;
}

export const isRedisConfigured =
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const TTL = 3600;

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function createCountyJobRedis(id: string, countyName: string, stateName: string): Promise<CountyJob> {
  const redis = await getRedis();
  const job: CountyJob = { id, status: "pending", countyName, stateName, progress: [], createdAt: Date.now() };
  await redis.set(`county-job:${id}`, job, { ex: TTL });
  return job;
}

async function getCountyJobRedis(id: string): Promise<CountyJob | undefined> {
  const redis = await getRedis();
  const job = await redis.get<CountyJob>(`county-job:${id}`);
  return job ?? undefined;
}

async function updateCountyJobRedis(id: string, update: Partial<CountyJob>): Promise<void> {
  const redis = await getRedis();
  const job = await redis.get<CountyJob>(`county-job:${id}`);
  if (job) await redis.set(`county-job:${id}`, { ...job, ...update }, { ex: TTL });
}

declare global {
  // eslint-disable-next-line no-var
  var __countyJobStore: Map<string, CountyJob> | undefined;
}
if (!global.__countyJobStore) global.__countyJobStore = new Map<string, CountyJob>();
const memStore = global.__countyJobStore;

function createCountyJobMem(id: string, countyName: string, stateName: string): CountyJob {
  const job: CountyJob = { id, status: "pending", countyName, stateName, progress: [], createdAt: Date.now() };
  memStore.set(id, job);
  return job;
}

function getCountyJobMem(id: string): CountyJob | undefined {
  return memStore.get(id);
}

function updateCountyJobMem(id: string, update: Partial<CountyJob>): void {
  const job = memStore.get(id);
  if (job) memStore.set(id, { ...job, ...update });
}

export async function createCountyJob(id: string, countyName: string, stateName: string): Promise<CountyJob> {
  if (isRedisConfigured) return createCountyJobRedis(id, countyName, stateName);
  return Promise.resolve(createCountyJobMem(id, countyName, stateName));
}

export async function getCountyJob(id: string): Promise<CountyJob | undefined> {
  if (isRedisConfigured) return getCountyJobRedis(id);
  return Promise.resolve(getCountyJobMem(id));
}

export async function updateCountyJob(id: string, update: Partial<CountyJob>): Promise<void> {
  if (isRedisConfigured) return updateCountyJobRedis(id, update);
  return Promise.resolve(updateCountyJobMem(id, update));
}
