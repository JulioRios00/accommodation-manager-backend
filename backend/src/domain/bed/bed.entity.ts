/** `inactive` is a bed that exists in the records but is not part of lettable stock —
 *  the spreadsheet marks these with a Z bedroom (Z1, Z2…). It stays visible and counted
 *  separately rather than being soft-deleted, so a drop in bed numbers is explainable. */
export type BedStatus = 'vacant' | 'allocated' | 'inactive';

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
