import { ErrorLog } from './error-log.entity';

export const ERROR_LOG_REPOSITORY = 'ErrorLogRepository';

export interface IErrorLogRepository {
  logError(error: Partial<ErrorLog>): Promise<ErrorLog>;
  findById(id: string): Promise<ErrorLog | null>;
  findUnresolved(limit?: number, offset?: number): Promise<{ items: ErrorLog[]; total: number }>;
  findAll(limit?: number, offset?: number): Promise<{ items: ErrorLog[]; total: number }>;
  search(query: string, limit?: number): Promise<ErrorLog[]>;
  resolve(id: string, resolvedBy: string, notes?: string): Promise<ErrorLog>;
  delete(id: string): Promise<void>;
}
