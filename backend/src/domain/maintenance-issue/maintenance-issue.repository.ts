import { MaintenanceIssue } from './maintenance-issue.entity';

export const MAINTENANCE_ISSUE_REPOSITORY = 'MaintenanceIssueRepository';

export interface IMaintenanceIssueRepository {
  findById(id: string): Promise<MaintenanceIssue | null>;
  findByTicketId(ticketId: string): Promise<MaintenanceIssue[]>;
  save(issue: Partial<MaintenanceIssue>): Promise<MaintenanceIssue>;
  delete(id: string): Promise<void>;
}
