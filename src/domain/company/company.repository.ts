import { Company } from './company.entity';

export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY';

export interface ICompanyRepository {
  findAll(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  save(company: Partial<Company>): Promise<Company>;
  delete(id: string): Promise<void>;
}
