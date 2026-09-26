import { GetBedsUseCase } from '../../application/use-cases/get-beds.use-case';
import { SaveBedUseCase, SaveBedDto } from '../../application/use-cases/save-bed.use-case';
import { DeleteBedUseCase } from '../../application/use-cases/delete-bed.use-case';
import { Actor } from '../../application/services/audit-log.service';
export declare class BedsController {
    private readonly getBeds;
    private readonly saveBed;
    private readonly deleteBed;
    constructor(getBeds: GetBedsUseCase, saveBed: SaveBedUseCase, deleteBed: DeleteBedUseCase);
    findAll(propertyId?: string): Promise<import("../../application/use-cases/get-beds.use-case").BedWithBooking[]>;
    create(dto: SaveBedDto, actor?: Actor): Promise<import("../../domain/bed/bed.entity").Bed>;
    update(id: string, dto: SaveBedDto, actor?: Actor): Promise<import("../../domain/bed/bed.entity").Bed>;
    remove(id: string, actor?: Actor): Promise<void>;
}
