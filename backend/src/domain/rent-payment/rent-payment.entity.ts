export class RentPaymentInstallment {
  id: string;
  rentPaymentId: string;
  amount: number;
  paidAt: Date;
  notes: string | null;
  createdAt: Date;
}

/** Derives payment status from amount paid vs. amount due — the single source of truth for
 *  what "Paid" / "Partially Paid" / "Unpaid" means, used wherever amountPaid is recorded. */
export function derivePaymentStatus(amountPaid: number, rentAmount: number): string {
  if (amountPaid <= 0) return 'unpaid';
  if (amountPaid < rentAmount) return 'partially_paid';
  return 'paid';
}

export class RentPayment {
  id: string;
  residentId: string;
  bookingId: string | null;
  propertyId: string;
  month: string;
  paymentDueDay: number | null;
  rentAmount: number;
  amountPaid: number;
  /** Null when it is genuinely unknown, e.g. imported from a month predating the
   *  spreadsheet's Overdue Payment Status column. */
  lateStatus: string | null;
  paymentStatus: string;
  datePaid: Date | null;
  notes: string | null;
  installments: RentPaymentInstallment[];
  /** Escalation idempotency guard + audit trail — null until that reminder has actually
   *  gone out for this invoice. See RentPaymentEscalationCron. */
  d1ReminderSentAt: Date | null;
  d4NoticeSentAt: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
