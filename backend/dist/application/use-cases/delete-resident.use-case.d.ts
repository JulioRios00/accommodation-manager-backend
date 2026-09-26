import { IResidentRepository } from '../../domain/resident/resident.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
export declare class DeleteResidentUseCase {
    private readonly repo;
    private readonly auditLog;
    constructor(repo: IResidentRepository, auditLog: AuditLogService);
    execute(id: string, actor?: Actor): Promise<void>;
}
