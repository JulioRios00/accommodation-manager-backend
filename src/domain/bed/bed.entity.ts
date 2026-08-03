export type BedStatus = 'vacant' | 'allocated';

export class Bed {
  id: string;
  propertyId: string;
  propertyCode?: string;
  bedNumber: number;
  bedroomId: string | null;
  bedroomName: string | null;
  name: string | null;
  position: number | null;
  status: BedStatus;
  bedroomType: string;
  sex: string;
  bedSize: string;
  depositAmount: number;
  rentAmount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
