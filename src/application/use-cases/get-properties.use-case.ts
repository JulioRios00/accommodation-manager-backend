import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { Property } from '../../domain/property/property.entity';

@Injectable()
export class GetPropertiesUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(): Promise<Property[]> {
    console.log('[GetPropertiesUseCase] fetching all active properties');
    const results = await this.propertyRepo.findAll();
    console.log(`[GetPropertiesUseCase] found ${results.length} properties:`, results.map(p => ({ id: p.id, code: p.code, active: p.active })));
    return results;
  }
}
