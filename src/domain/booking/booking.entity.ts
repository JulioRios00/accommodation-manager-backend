export type BookingStatus = 'active' | 'upcoming' | 'completed';

export class Booking {
  id: string;
  bedId: string;
  residentId: string;
  checkInDate: Date | null;
  contractEndDate: Date | null;
  checkOutDate: Date | null;
  depositAmount: number;
  rentAmount: number;
  isHeadResident: boolean;
  isTemporary: boolean;
  status: BookingStatus;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
}
