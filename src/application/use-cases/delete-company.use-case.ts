import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICompanyRepository, COMPANY_REPOSITORY } from '../../domain/company/company.repository';

@Injectable()
export class DeleteCompanyUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repo: ICompanyRepository) {}
  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Company ${id} not found`);
    await this.repo.delete(id);
  }
}
