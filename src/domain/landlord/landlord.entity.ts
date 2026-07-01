export class Landlord {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  iban: string | null;
  bic: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  payoutDay: number | null;
  residentPaymentDueDay: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
