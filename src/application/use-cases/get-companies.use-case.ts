import { Inject, Injectable } from '@nestjs/common';
import { ICompanyRepository, COMPANY_REPOSITORY } from '../../domain/company/company.repository';

@Injectable()
export class GetCompaniesUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repo: ICompanyRepository) {}
  async execute() { return this.repo.findAll(); }
}
