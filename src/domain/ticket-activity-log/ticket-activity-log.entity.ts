export class TicketActivityLog {
  id: string;
  ticketId: string;
  eventType: string;
  clerkUserId: string | null;
  clerkUserName: string | null;
  comment: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}
