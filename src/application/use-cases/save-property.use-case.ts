import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Property } from '../../domain/property/property.entity';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';

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
  internetOnlineLink?: string | null;
  internetBusinessPhone?: string | null;
  internetNotes?: string | null;
  wastePhone?: string | null;
  salesDescription?: string | null;
  eirCode?: string | null;
  propertyType?: string | null;
  crn?: string | null;
  propertyEmail?: string | null;
  landlordId?: string | null;
}

const ALLOWED_PROPERTY_TYPES = ['House', 'Apartment', 'Duplex', 'Studio Block', 'Other'];

@Injectable()
export class SavePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly repo: IPropertyRepository,
    @Inject(LANDLORD_REPOSITORY) private readonly landlordRepo: ILandlordRepository,
  ) {}

  async execute(dto: SavePropertyDto): Promise<Property> {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Property ${dto.id} not found`);
    }
    const normalized = this.normalize(dto);
    this.validateFields(normalized);
    await this.validateUniqueness(normalized);
    await this.validateLandlord(normalized);
    if (normalized.id) return this.repo.save(normalized as any);
    return this.repo.save({ ...normalized, active: true } as any);
  }

  private normalize(dto: SavePropertyDto): SavePropertyDto {
    const result = { ...dto };
    if (result.eirCode != null) {
      result.eirCode = result.eirCode.trim().toUpperCase() || null;
    }
    return result;
  }

  private validateFields(dto: SavePropertyDto): void {
    if (dto.eirCode && dto.eirCode.length > 10) {
      throw new BadRequestException('EirCode must be 10 characters or fewer');
    }
    if (dto.propertyType != null && !ALLOWED_PROPERTY_TYPES.includes(dto.propertyType)) {
      throw new BadRequestException(`Invalid property type "${dto.propertyType}". Allowed: ${ALLOWED_PROPERTY_TYPES.join(', ')}`);
    }
  }

  private async validateLandlord(dto: SavePropertyDto): Promise<void> {
    if (dto.landlordId) {
      const landlord = await this.landlordRepo.findById(dto.landlordId);
      if (!landlord) throw new NotFoundException(`Landlord ${dto.landlordId} not found`);
    }
  }

  private async validateUniqueness(dto: SavePropertyDto): Promise<void> {
    if (dto.electricityMprn) {
      const conflict = await this.repo.findByMprn(dto.electricityMprn);
      if (conflict && conflict.id !== dto.id) {
        throw new BadRequestException(`MPRN ${dto.electricityMprn} is already in use by property ${conflict.code}`);
      }
    }
    if (dto.gasGprn) {
      const conflict = await this.repo.findByGprn(dto.gasGprn);
      if (conflict && conflict.id !== dto.id) {
        throw new BadRequestException(`GPRN ${dto.gasGprn} is already in use by property ${conflict.code}`);
      }
    }
  }
}
