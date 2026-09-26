export type BookingStatus = 'active' | 'upcoming' | 'completed';
export interface BookingBed {
    id: string;
    bedNumber: number;
    name: string | null;
    bedroomType: string;
    bedroomName: string | null;
    propertyId: string;
    propertyCode: string | null;
}
export interface BookingResident {
    id: string;
    fullName: string;
    email: string | null;
    telephone: string | null;
}
export declare class Booking {
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
    bed?: BookingBed | null;
    resident?: BookingResident | null;
}
