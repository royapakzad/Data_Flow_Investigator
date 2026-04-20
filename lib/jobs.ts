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

// Use a global so the Map survives Next.js dev-mode hot reloads and
// cross-route module isolation (each route gets its own module instance).
declare global {
  // eslint-disable-next-line no-var
  var __jobStore: Map<string, Job> | undefined;
}
if (!global.__jobStore) {
  global.__jobStore = new Map<string, Job>();
  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    global.__jobStore!.forEach((job, id) => {
      if (job.createdAt < cutoff) global.__jobStore!.delete(id);
    });
  }, 10 * 60 * 1000);
}
const jobs = global.__jobStore;

export function createJob(id: string, vendorName: string): Job {
  const job: Job = { id, status: "pending", vendorName, progress: [], createdAt: Date.now() };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, update: Partial<Job>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...update });
}
