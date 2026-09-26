import { IPropertyRepository } from '../../domain/property/property.repository';
import { IBedRepository } from '../../domain/bed/bed.repository';
import { IBookingRepository } from '../../domain/booking/booking.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
export declare class DeletePropertyUseCase {
    private readonly propertyRepo;
    private readonly bedRepo;
    private readonly bookingRepo;
    private readonly auditLog;
    constructor(propertyRepo: IPropertyRepository, bedRepo: IBedRepository, bookingRepo: IBookingRepository, auditLog: AuditLogService);
    execute(id: string, actor?: Actor): Promise<void>;
}
