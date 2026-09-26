import { IPropertyRepository } from '../../domain/property/property.repository';
import { Property } from '../../domain/property/property.entity';
export declare class GetPropertiesUseCase {
    private readonly propertyRepo;
    constructor(propertyRepo: IPropertyRepository);
    execute(includeInactive?: boolean): Promise<Property[]>;
}
