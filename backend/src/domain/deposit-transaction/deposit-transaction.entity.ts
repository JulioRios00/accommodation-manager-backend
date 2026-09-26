export class DepositTransaction {
  id: string;
  type: string;
  residentId: string | null;
  bookingId: string | null;
  propertyId: string;
  bedId: string | null;
  residentName: string;
  checkoutDate: Date | null;
  depositAmount: number;
  proRataRentAmount: number | null;
  iban: string | null;
  payeeAddress: string | null;
  status: string;
  dateProcessed: Date | null;
  bankReference: string | null;
  company: string | null;
  comments: string | null;
  /** Business-day deadline for refunds (UC-601) — computed once at creation from checkoutDate,
   *  not recomputed on read since the inputs never change after the fact. */
  refundDueDate: Date | null;
  completedBy: string | null;
  completedByName: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
