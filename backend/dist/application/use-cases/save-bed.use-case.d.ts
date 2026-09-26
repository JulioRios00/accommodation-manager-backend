import { Bed } from '../../domain/bed/bed.entity';
import { IBedRepository } from '../../domain/bed/bed.repository';
import { IBedroomRepository } from '../../domain/bedroom/bedroom.repository';
import { IBedRateHistoryRepository } from '../../domain/bed-rate-history/bed-rate-history.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
export interface SaveBedDto {
    id?: string;
    propertyId: string;
    bedNumber: number;
    bedroomId?: string | null;
    name?: string | null;
    position?: number | null;
    status?: string;
    bedroomType: string;
    sex: string;
    bedSize: string;
    depositAmount?: number;
    rentAmount?: number;
}
export declare class SaveBedUseCase {
    private readonly repo;
    private readonly bedroomRepo;
    private readonly rateHistoryRepo;
    private readonly auditLog;
    constructor(repo: IBedRepository, bedroomRepo: IBedroomRepository, rateHistoryRepo: IBedRateHistoryRepository, auditLog: AuditLogService);
    execute(dto: SaveBedDto, actor?: Actor): Promise<Bed>;
}
