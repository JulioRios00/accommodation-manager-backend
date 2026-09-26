import { IPropertyRepository } from '../../domain/property/property.repository';
import { IBedRepository } from '../../domain/bed/bed.repository';
import { IResidentRepository } from '../../domain/resident/resident.repository';
import { IBookingRepository } from '../../domain/booking/booking.repository';
import { IBedroomRepository } from '../../domain/bedroom/bedroom.repository';
import { ImportSkipReason } from './import-deposits.use-case';
export declare class ImportXlsxUseCase {
    private readonly propertyRepo;
    private readonly bedRepo;
    private readonly residentRepo;
    private readonly bookingRepo;
    private readonly bedroomRepo;
    private readonly logger;
    constructor(propertyRepo: IPropertyRepository, bedRepo: IBedRepository, residentRepo: IResidentRepository, bookingRepo: IBookingRepository, bedroomRepo: IBedroomRepository);
    execute(buffer: Buffer): Promise<{
        imported: number;
        historicalImported: number;
        skipped: number;
        skipReasons: ImportSkipReason[];
    }>;
    private importCheckedOut;
    private upsertPropertyAndBed;
    private upsertResident;
    private ensureBedroom;
}
