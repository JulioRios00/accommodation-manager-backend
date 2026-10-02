export class MaintenanceIssue {
  id: string;
  ticketId: string;
  title: string;
  category: string | null;
  status: string;
  descriptionRequested: string | null;
  descriptionDone: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}
