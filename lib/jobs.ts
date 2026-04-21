import { Redis } from "@upstash/redis";
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

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 3600; // 1 hour

export async function createJob(id: string, vendorName: string): Promise<Job> {
  const job: Job = { id, status: "pending", vendorName, progress: [], createdAt: Date.now() };
  await redis.set(`job:${id}`, job, { ex: TTL });
  return job;
}

export async function getJob(id: string): Promise<Job | undefined> {
  const job = await redis.get<Job>(`job:${id}`);
  return job ?? undefined;
}

export async function updateJob(id: string, update: Partial<Job>): Promise<void> {
  const job = await redis.get<Job>(`job:${id}`);
  if (job) await redis.set(`job:${id}`, { ...job, ...update }, { ex: TTL });
}
