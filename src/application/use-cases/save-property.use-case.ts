import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Property } from '../../domain/property/property.entity';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

export interface SavePropertyDto {
  id?: string;
  code: string;
  bu: string;
  area?: string | null;
  fullAddress?: string | null;
  officeKeys?: boolean;
  keysCount?: number;
  securityKeysCount?: number;
  fobCount?: number;
  electricityStatus?: string | null;
  gasStatus?: string | null;
}

@Injectable()
export class SavePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly repo: IPropertyRepository,
  ) {}

  async execute(dto: SavePropertyDto): Promise<Property> {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Property ${dto.id} not found`);
      return this.repo.save(dto);
    }
    return this.repo.save({ ...dto, active: true });
  }
}
