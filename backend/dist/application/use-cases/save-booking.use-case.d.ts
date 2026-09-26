import { Booking, BookingStatus } from '../../domain/booking/booking.entity';
import { IBookingRepository } from '../../domain/booking/booking.repository';
import { IBedRepository } from '../../domain/bed/bed.repository';
import { IResidentRepository } from '../../domain/resident/resident.repository';
import { IRentPaymentRepository } from '../../domain/rent-payment/rent-payment.repository';
import { IBedRateHistoryRepository } from '../../domain/bed-rate-history/bed-rate-history.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
export type RentChangeScope = 'payment' | 'period' | 'bed';
export interface SaveBookingDto {
    id?: string;
    bedId: string;
    residentId: string;
    checkInDate?: string | null;
    contractEndDate?: string | null;
    checkOutDate?: string | null;
    depositAmount?: number;
    rentAmount?: number;
    isHeadResident?: boolean;
    isTemporary?: boolean;
    status: BookingStatus;
    comments?: string | null;
    rentChangeScope?: RentChangeScope;
}
export declare class SaveBookingUseCase {
    private readonly repo;
    private readonly bedRepo;
    private readonly residentRepo;
    private readonly rentPaymentRepo;
    private readonly rateHistoryRepo;
    private readonly auditLog;
    constructor(repo: IBookingRepository, bedRepo: IBedRepository, residentRepo: IResidentRepository, rentPaymentRepo: IRentPaymentRepository, rateHistoryRepo: IBedRateHistoryRepository, auditLog: AuditLogService);
    execute(dto: SaveBookingDto, actor?: Actor): Promise<Booking>;
}
