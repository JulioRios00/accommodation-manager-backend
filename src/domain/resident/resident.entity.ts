export class Resident {
  id: string;
  clerkUserId: string | null;
  fullName: string;
  email: string | null;
  telephone: string | null;
  gender: string | null;
  nationality: string | null;
  personalId: string | null;
  iban: string | null;
  emergencyContact: string | null;
  source: string | null;
  paymentDueDay: number | null;
  comments: string | null;
  delinquent: boolean;
  hasObservation: boolean;
  observation: string | null;
  createdAt: Date;
  updatedAt: Date;
}
