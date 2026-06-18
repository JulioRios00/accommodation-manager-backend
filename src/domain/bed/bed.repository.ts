import { Bed } from './bed.entity';

export interface IBedRepository {
  findAll(propertyId?: string): Promise<Bed[]>;
  findById(id: string): Promise<Bed | null>;
  findByPropertyAndNumber(propertyId: string, bedNumber: number): Promise<Bed | null>;
  save(bed: Partial<Bed>): Promise<Bed>;
  upsertByPropertyAndNumber(bed: Partial<Bed>): Promise<Bed>;
  delete(id: string): Promise<void>;
  deleteByPropertyId(propertyId: string): Promise<void>;
}

export const BED_REPOSITORY = 'BED_REPOSITORY';
