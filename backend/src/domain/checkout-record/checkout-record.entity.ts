export type RoomConditionRating = 'good' | 'fair' | 'damaged';

export interface RoomConditionChecklistItem {
  category: string;
  condition: RoomConditionRating;
  notes: string | null;
}

/** Fixed category list for the exit-inspection checklist (UC-601) — simple and self-contained,
 *  deliberately not wired into the PropertySpace/SpaceItem inventory feature. */
export const ROOM_CONDITION_CATEGORIES = [
  'Cleanliness', 'Walls & Paint', 'Furniture', 'Appliances', 'Keys Returned', 'Damages',
] as const;

export class CheckoutRecord {
  id: string;
  bookingId: string;
  checkoutDate: Date;
  keysReturned: boolean;
  inspectionNotes: string | null;
  roomConditionChecklist: RoomConditionChecklistItem[] | null;
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
