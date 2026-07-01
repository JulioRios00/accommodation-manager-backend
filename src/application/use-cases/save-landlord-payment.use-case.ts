import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';

export interface SaveLandlordPaymentDto {
  id?: string;
  propertyId: string;
  landlordId: string;
  month: string;
  amountDue: number;
  amountPaid?: number;
  dateDue?: string | null;
  datePaid?: string | null;
  beneficiaryName?: string | null;
  iban?: string | null;
  bic?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  status?: string;
  notes?: string | null;
}

@Injectable()
export class SaveLandlordPaymentUseCase {
  constructor(@Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly repo: ILandlordPaymentRepository) {}

  async execute(dto: SaveLandlordPaymentDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`LandlordPayment ${dto.id} not found`);
    }
    return this.repo.save({ ...dto, amountPaid: dto.amountPaid ?? 0, status: dto.status ?? 'pending' } as any);
  }
}
