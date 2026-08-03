import { Inject, Injectable } from '@nestjs/common';
import { PropertySpace } from '../../domain/property-space/property-space.entity';
import { IPropertySpaceRepository, PROPERTY_SPACE_REPOSITORY } from '../../domain/property-space/property-space.repository';

@Injectable()
export class GetPropertySpacesUseCase {
  constructor(@Inject(PROPERTY_SPACE_REPOSITORY) private readonly repo: IPropertySpaceRepository) {}

  async execute(propertyId?: string): Promise<PropertySpace[]> {
    return this.repo.findAll(propertyId);
  }
}
