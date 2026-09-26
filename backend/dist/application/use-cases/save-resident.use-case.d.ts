import { Resident } from '../../domain/resident/resident.entity';
import { IResidentRepository } from '../../domain/resident/resident.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
export interface SaveResidentDto {
    id?: string;
    clerkUserId?: string | null;
    fullName: string;
    email?: string | null;
    telephone?: string | null;
    gender?: string | null;
    nationality?: string | null;
    personalId?: string | null;
    iban?: string | null;
    emergencyContact?: string | null;
    source?: string | null;
    paymentDueDay?: number | null;
    comments?: string | null;
    delinquent?: boolean;
    hasObservation?: boolean;
    observation?: string | null;
}
export declare class SaveResidentUseCase {
    private readonly repo;
    private readonly auditLog;
    constructor(repo: IResidentRepository, auditLog: AuditLogService);
    execute(dto: SaveResidentDto, actor?: Actor): Promise<Resident>;
}
