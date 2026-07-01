export class RentPaymentInstallment {
  id: string;
  rentPaymentId: string;
  amount: number;
  paidAt: Date;
  notes: string | null;
  createdAt: Date;
}

export class RentPayment {
  id: string;
  residentId: string;
  bookingId: string;
  propertyId: string;
  month: string;
  paymentDueDay: number | null;
  rentAmount: number;
  amountPaid: number;
  lateStatus: string;
  notes: string | null;
  installments: RentPaymentInstallment[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
