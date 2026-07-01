import { Inject, Injectable } from '@nestjs/common';
import { IPropertyAdministratorRepository, PROPERTY_ADMINISTRATOR_REPOSITORY } from '../../domain/property-administrator/property-administrator.repository';

@Injectable()
export class DeletePropertyAdministratorUseCase {
  constructor(@Inject(PROPERTY_ADMINISTRATOR_REPOSITORY) private readonly repo: IPropertyAdministratorRepository) {}
  async execute(propertyId: string, clerkUserId: string) {
    await this.repo.deleteByPropertyAndUser(propertyId, clerkUserId);
  }
}
