import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type ImportJobStatus = 'running' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  finishedAt?: Date;
}

// In-memory only — the app runs as a single PM2 process, and a job lost to a
// restart mid-import just means the user re-uploads, same as before this existed.
// Prunes finished jobs after an hour so this doesn't grow unbounded.
const RETENTION_MS = 60 * 60 * 1000;

@Injectable()
export class ImportJobsService {
  private jobs = new Map<string, ImportJob>();

  create(): ImportJob {
    this.prune();
    const job: ImportJob = { id: randomUUID(), status: 'running', createdAt: new Date() };
    this.jobs.set(job.id, job);
    return job;
  }

  get(id: string): ImportJob | undefined {
    return this.jobs.get(id);
  }

  complete(id: string, result: Record<string, unknown>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'completed';
    job.result = result;
    job.finishedAt = new Date();
  }

  fail(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'failed';
    job.error = error;
    job.finishedAt = new Date();
  }

  private prune(): void {
    const cutoff = Date.now() - RETENTION_MS;
    for (const [id, job] of this.jobs) {
      if (job.finishedAt && job.finishedAt.getTime() < cutoff) this.jobs.delete(id);
    }
  }
}
