import { IBookingRepository } from '../../domain/booking/booking.repository';
import { IBedRepository } from '../../domain/bed/bed.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
export declare class DeleteBookingUseCase {
    private readonly repo;
    private readonly bedRepo;
    private readonly auditLog;
    constructor(repo: IBookingRepository, bedRepo: IBedRepository, auditLog: AuditLogService);
    execute(id: string, actor?: Actor): Promise<void>;
}
