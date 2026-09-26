import { GetPropertiesUseCase } from '../../application/use-cases/get-properties.use-case';
import { SavePropertyUseCase, SavePropertyDto } from '../../application/use-cases/save-property.use-case';
import { DeletePropertyUseCase } from '../../application/use-cases/delete-property.use-case';
import { HardDeletePropertyUseCase } from '../../application/use-cases/hard-delete-property.use-case';
import { Actor } from '../../application/services/audit-log.service';
export declare class PropertiesController {
    private readonly getProperties;
    private readonly saveProperty;
    private readonly deleteProperty;
    private readonly hardDeleteProperty;
    constructor(getProperties: GetPropertiesUseCase, saveProperty: SavePropertyUseCase, deleteProperty: DeletePropertyUseCase, hardDeleteProperty: HardDeletePropertyUseCase);
    findAll(includeInactive?: string): Promise<import("../../domain/property/property.entity").Property[]>;
    create(dto: SavePropertyDto, actor?: Actor): Promise<import("../../domain/property/property.entity").Property>;
    update(id: string, dto: SavePropertyDto, actor?: Actor): Promise<import("../../domain/property/property.entity").Property>;
    remove(id: string, actor?: Actor): Promise<void>;
    removeHard(id: string): Promise<void>;
}
