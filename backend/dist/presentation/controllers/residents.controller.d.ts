import { GetResidentsUseCase } from '../../application/use-cases/get-residents.use-case';
import { SaveResidentUseCase, SaveResidentDto } from '../../application/use-cases/save-resident.use-case';
import { DeleteResidentUseCase } from '../../application/use-cases/delete-resident.use-case';
import { Actor } from '../../application/services/audit-log.service';
export declare class ResidentsController {
    private readonly getResidents;
    private readonly saveResident;
    private readonly deleteResident;
    constructor(getResidents: GetResidentsUseCase, saveResident: SaveResidentUseCase, deleteResident: DeleteResidentUseCase);
    findAll(): Promise<import("../../domain/resident/resident.entity").Resident[]>;
    create(dto: SaveResidentDto, actor?: Actor): Promise<import("../../domain/resident/resident.entity").Resident>;
    update(id: string, dto: SaveResidentDto, actor?: Actor): Promise<import("../../domain/resident/resident.entity").Resident>;
    remove(id: string, actor?: Actor): Promise<void>;
}
