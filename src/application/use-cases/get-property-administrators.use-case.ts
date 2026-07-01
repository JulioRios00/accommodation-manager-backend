import { Inject, Injectable } from '@nestjs/common';
import { IPropertyAdministratorRepository, PROPERTY_ADMINISTRATOR_REPOSITORY } from '../../domain/property-administrator/property-administrator.repository';

@Injectable()
export class GetPropertyAdministratorsUseCase {
  constructor(@Inject(PROPERTY_ADMINISTRATOR_REPOSITORY) private readonly repo: IPropertyAdministratorRepository) {}
  async execute(propertyId: string) { return this.repo.findByProperty(propertyId); }
}
