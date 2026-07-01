import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICompanyRepository, COMPANY_REPOSITORY } from '../../domain/company/company.repository';

export interface SaveCompanyDto {
  id?: string;
  name: string;
  address?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
}

@Injectable()
export class SaveCompanyUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly repo: ICompanyRepository) {}

  async execute(dto: SaveCompanyDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Company ${dto.id} not found`);
    }
    return this.repo.save(dto);
  }
}
