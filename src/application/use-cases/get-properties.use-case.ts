import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { Property } from '../../domain/property/property.entity';

@Injectable()
export class GetPropertiesUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(): Promise<Property[]> {
    return this.propertyRepo.findAll();
  }
}
