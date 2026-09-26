import { SavedReport } from './saved-report.entity';

export const SAVED_REPORT_REPOSITORY = 'SAVED_REPORT_REPOSITORY';

export interface ISavedReportRepository {
  findById(id: string): Promise<SavedReport | null>;
  findByUser(userId: string): Promise<SavedReport[]>;
  findPublic(entityType: string): Promise<SavedReport[]>;
  save(report: Partial<SavedReport>): Promise<SavedReport>;
  delete(id: string): Promise<void>;
}
