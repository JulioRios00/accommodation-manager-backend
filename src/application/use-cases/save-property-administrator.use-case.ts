import { Inject, Injectable } from '@nestjs/common';
import { IPropertyAdministratorRepository, PROPERTY_ADMINISTRATOR_REPOSITORY } from '../../domain/property-administrator/property-administrator.repository';

export interface SavePropertyAdministratorDto {
  propertyId: string;
  clerkUserId: string;
  clerkUserName: string;
}

@Injectable()
export class SavePropertyAdministratorUseCase {
  constructor(@Inject(PROPERTY_ADMINISTRATOR_REPOSITORY) private readonly repo: IPropertyAdministratorRepository) {}
  async execute(dto: SavePropertyAdministratorDto) { return this.repo.save(dto); }
}
