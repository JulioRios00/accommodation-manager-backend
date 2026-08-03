import { Property } from './property.entity';

export interface IPropertyRepository {
  findAll(): Promise<Property[]>;
  findById(id: string): Promise<Property | null>;
  findByCode(code: string): Promise<Property | null>;
  findByMprn(mprn: string): Promise<Property | null>;
  findByGprn(gprn: string): Promise<Property | null>;
  save(property: Partial<Property>): Promise<Property>;
  upsertByCode(property: Partial<Property>): Promise<Property>;
  delete(id: string): Promise<void>;
}

export const PROPERTY_REPOSITORY = 'PROPERTY_REPOSITORY';
