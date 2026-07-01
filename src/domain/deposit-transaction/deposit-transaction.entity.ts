export class DepositTransaction {
  id: string;
  type: string;
  residentId: string;
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
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
