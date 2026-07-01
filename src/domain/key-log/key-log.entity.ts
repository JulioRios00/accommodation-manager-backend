export class KeyLog {
  id: string;
  propertyId: string;
  bedId: string | null;
  keyType: string;
  takenBy: string;
  takenByType: string;
  takenAt: Date;
  expectedReturnAt: Date | null;
  actualReturnAt: Date | null;
  returnStatus: string;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
