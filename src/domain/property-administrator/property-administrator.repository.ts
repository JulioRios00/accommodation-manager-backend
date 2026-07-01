import { PropertyAdministrator } from './property-administrator.entity';

export const PROPERTY_ADMINISTRATOR_REPOSITORY = 'PROPERTY_ADMINISTRATOR_REPOSITORY';

export interface IPropertyAdministratorRepository {
  findByProperty(propertyId: string): Promise<PropertyAdministrator[]>;
  save(admin: Partial<PropertyAdministrator>): Promise<PropertyAdministrator>;
  delete(id: string): Promise<void>;
  deleteByPropertyAndUser(propertyId: string, clerkUserId: string): Promise<void>;
}
