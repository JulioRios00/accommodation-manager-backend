import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Property } from '../../domain/property/property.entity';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

export interface SavePropertyDto {
  id?: string;
  code: string;
  bu: string;
  area?: string | null;
  fullAddress?: string | null;
  officeKeysCount?: number;
  keysCount?: number;
  securityKeysCount?: number;
  fobCount?: number;
  keyCode?: string | null;
  electricityStatus?: string | null;
  electricityMprn?: string | null;
  electricitySupplier?: string | null;
  electricityAccountNumber?: string | null;
  electricityKeypadCode?: string | null;
  gasStatus?: string | null;
  gasGprn?: string | null;
  gasSupplier?: string | null;
  gasAccountNumber?: string | null;
  gasPin?: string | null;
  wasteSupplier?: string | null;
  wasteAccountNumber?: string | null;
  wasteEmail?: string | null;
  wastePassword?: string | null;
  wastePaymentType?: string | null;
  wasteMonthlyAmount?: number | null;
  wasteStatus?: string | null;
  internetSupplier?: string | null;
  internetAccountNumber?: string | null;
  internetEmail?: string | null;
  internetUsername?: string | null;
  internetPassword?: string | null;
  internetPaymentType?: string | null;
  internetStatus?: string | null;
  internetContractEndDate?: string | null;
  salesDescription?: string | null;
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
