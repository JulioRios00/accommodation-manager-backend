import { CompanyProfile } from './company-profile.entity';

export const COMPANY_PROFILE_REPOSITORY = 'COMPANY_PROFILE_REPOSITORY';

export interface ICompanyProfileRepository {
  /** Always resolves — returns the defaults when nothing has been saved yet. */
  get(): Promise<CompanyProfile>;
  save(profile: Partial<CompanyProfile>): Promise<CompanyProfile>;
}
