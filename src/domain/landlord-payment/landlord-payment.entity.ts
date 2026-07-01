export class LandlordPayment {
  id: string;
  propertyId: string;
  landlordId: string;
  month: string;
  amountDue: number;
  amountPaid: number;
  dateDue: Date | null;
  datePaid: Date | null;
  beneficiaryName: string | null;
  iban: string | null;
  bic: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  status: string;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
