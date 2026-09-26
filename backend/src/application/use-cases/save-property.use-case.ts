import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Property } from '../../domain/property/property.entity';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

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
  paymentReference?: string | null;
  propertySupplier?: string | null;
  paymentNotes?: string | null;
  landlordPaymentDueDay?: number | null;
  residentPaymentDueDay?: number | null;
  officeKeysComment?: string | null;
  landlordId?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  active?: boolean;
}

const ALLOWED_PROPERTY_TYPES = ['House', 'Apartment', 'Duplex', 'Studio Block', 'Other'];

// When a lease period is on file, `active` is derived from it rather than manually toggled —
// null end date means an ongoing/undetermined lease. With no lease dates at all (e.g. a
// property imported without lease tracking), fall back to whatever the caller sent.
function deriveActive(leaseStartDate: Date | null, leaseEndDate: Date | null, fallback: boolean, now = new Date()): boolean {
  if (!leaseStartDate && !leaseEndDate) return fallback;
  if (leaseStartDate && now < leaseStartDate) return false;
  if (leaseEndDate && now > leaseEndDate) return false;
  return true;
}

@Injectable()
export class SavePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly repo: IPropertyRepository,
    @Inject(LANDLORD_REPOSITORY) private readonly landlordRepo: ILandlordRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: SavePropertyDto, actor?: Actor): Promise<Property> {
    let existing: Property | null = null;
    if (dto.id) {
      existing = await this.repo.findByIdAnyStatus(dto.id);
      if (!existing) throw new NotFoundException(`Property ${dto.id} not found`);
    }
    const normalized = this.normalize(dto);
    this.validateFields(normalized);
    await this.validateUniqueness(normalized);
    await this.validateLandlord(normalized);

    const leaseStartDate = normalized.leaseStartDate ? new Date(normalized.leaseStartDate) : null;
    const leaseEndDate = normalized.leaseEndDate ? new Date(normalized.leaseEndDate) : null;
    const payload = {
      ...normalized,
      leaseStartDate,
      leaseEndDate,
      active: deriveActive(leaseStartDate, leaseEndDate, normalized.active ?? existing?.active ?? true),
    };

    let property: Property;
    if (payload.id) {
      property = await this.repo.save(payload as any);
    } else {
      // A soft-deleted property can leave a row behind with this code — reactivate it
      // instead of inserting a fresh row, which would hit the unique constraint on `code`.
      const deletedMatch = await this.repo.findByCodeAnyStatus(payload.code);
      property =
        deletedMatch && !deletedMatch.active
          ? await this.repo.save({ ...payload, id: deletedMatch.id } as any)
          : await this.repo.save(payload as any);
    }

    await this.auditLog.record({
      actor,
      action: existing ? 'update' : 'create',
      entityType: 'Property',
      entityId: property.id,
      before: existing as unknown as Record<string, unknown>,
      after: property as unknown as Record<string, unknown>,
    });

    return property;
  }

  private normalize(dto: SavePropertyDto): SavePropertyDto {
    const result = { ...dto };
    if (result.eirCode != null) {
      result.eirCode = result.eirCode.trim().toUpperCase() || null;
    }
    if (result.internetContractEndDate === '') result.internetContractEndDate = null;
    if (result.leaseStartDate === '') result.leaseStartDate = null;
    if (result.leaseEndDate === '') result.leaseEndDate = null;
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
    // Duplicate code check
    const byCode = await this.repo.findByCode(dto.code);
    if (byCode && byCode.id !== dto.id) {
      throw new BadRequestException(
        `There is already another property with code "${dto.code}". Try another Property Code or edit the existing Property Profile for that code.`,
      );
    }

    if (dto.electricityMprn) {
      const conflict = await this.repo.findByMprn(dto.electricityMprn);
      if (conflict && conflict.id !== dto.id) {
        throw new BadRequestException(`MPRN ${dto.electricityMprn} is already in use by property ${conflict.code}`);
      }
    }
    if (dto.gasGprn && dto.gasGprn.trim().toUpperCase() !== 'N/A') {
      const conflict = await this.repo.findByGprn(dto.gasGprn);
      if (conflict && conflict.id !== dto.id) {
        throw new BadRequestException(`GPRN ${dto.gasGprn} is already in use by property ${conflict.code}`);
      }
    }
  }
}
