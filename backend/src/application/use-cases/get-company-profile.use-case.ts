import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_PROFILE_REPOSITORY,
  ICompanyProfileRepository,
} from '../../domain/company-profile/company-profile.repository';

@Injectable()
export class GetCompanyProfileUseCase {
  constructor(@Inject(COMPANY_PROFILE_REPOSITORY) private readonly repo: ICompanyProfileRepository) {}
  async execute() {
    return this.repo.get();
  }
}
