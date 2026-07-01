import { Landlord } from './landlord.entity';

export const LANDLORD_REPOSITORY = 'LANDLORD_REPOSITORY';

export interface ILandlordRepository {
  findAll(): Promise<Landlord[]>;
  findById(id: string): Promise<Landlord | null>;
  save(landlord: Partial<Landlord>): Promise<Landlord>;
  delete(id: string): Promise<void>;
}
