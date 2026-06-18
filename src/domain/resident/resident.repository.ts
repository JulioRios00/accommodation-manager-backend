import { Resident } from './resident.entity';

export interface IResidentRepository {
  findAll(): Promise<Resident[]>;
  findById(id: string): Promise<Resident | null>;
  save(resident: Partial<Resident>): Promise<Resident>;
  delete(id: string): Promise<void>;
}

export const RESIDENT_REPOSITORY = 'RESIDENT_REPOSITORY';
