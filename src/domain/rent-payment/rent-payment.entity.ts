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
  lateStatus: string;
  paymentStatus: string;
  datePaid: Date | null;
  notes: string | null;
  installments: RentPaymentInstallment[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
