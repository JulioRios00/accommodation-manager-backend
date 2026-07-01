export class CheckoutRecord {
  id: string;
  bookingId: string;
  checkoutDate: Date;
  keysReturned: boolean;
  inspectionNotes: string | null;
  depositRefundAmount: number | null;
  refundIban: string | null;
  proRataRentAmount: number | null;
  proRataAdjustment: number | null;
  newResidentLinked: boolean;
  newResidentId: string | null;
  processedBy: string | null;
  processedByName: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
