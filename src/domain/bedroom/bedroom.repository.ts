import { Bedroom } from './bedroom.entity';

export interface IBedroomRepository {
  findAll(propertyId?: string): Promise<Bedroom[]>;
  findById(id: string): Promise<Bedroom | null>;
  findByPropertyAndName(propertyId: string, name: string): Promise<Bedroom | null>;
  save(bedroom: Partial<Bedroom>): Promise<Bedroom>;
  delete(id: string): Promise<void>;
}

export const BEDROOM_REPOSITORY = 'BEDROOM_REPOSITORY';
