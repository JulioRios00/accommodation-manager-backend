import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';

export interface SaveLandlordDto {
  id?: string;
  name: string;
  email?: string | null;
  address?: string | null;
  bankName?: string | null;
  sortCode?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  payoutDay?: number | null;
  residentPaymentDueDay?: number | null;
}

@Injectable()
export class SaveLandlordUseCase {
  constructor(@Inject(LANDLORD_REPOSITORY) private readonly repo: ILandlordRepository) {}

  async execute(dto: SaveLandlordDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Landlord ${dto.id} not found`);
    }
    return this.repo.save(dto);
  }
}
