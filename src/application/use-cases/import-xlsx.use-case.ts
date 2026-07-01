import { Inject, Injectable } from '@nestjs/common';
import { parseXlsx } from '../../infrastructure/parsers/xlsx.parser';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';

@Injectable()
export class ImportXlsxUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number }> {
    const rows = parseXlsx(buffer);
    let imported = 0;

    for (const row of rows) {
      // Upsert property
      const property = await this.propertyRepo.upsertByCode({
        code: row.code,
        bu: row.bu,
        area: row.area,
        fullAddress: row.fullAddress,
        keysCount: row.keysCount,
        securityKeysCount: row.securityKeysCount,
        fobCount: row.fobCount,
        electricityStatus: row.electricityStatus,
        gasStatus: row.gasStatus,
      });

      // Upsert bed
      const bed = await this.bedRepo.upsertByPropertyAndNumber({
        propertyId: property.id,
        bedNumber: row.bedNumber,
        bedroomType: row.bedroomType,
        sex: row.sex,
        bedSize: row.bedSize,
        depositAmount: row.depositAmount,
        rentAmount: row.rentAmount,
      });

      // Clear existing bookings for this bed before re-importing
      await this.bookingRepo.deleteByBedId(bed.id);

      // Create current resident booking if name exists and is not a placeholder
      const currentName = row.residentName;
      if (currentName && currentName.toLowerCase() !== 'resident full name') {
        const resident = await this.residentRepo.save({
          fullName: currentName,
          email: row.residentEmail,
          telephone: row.residentTelephone,
          nationality: row.residentNationality,
          personalId: row.residentPersonalId,
          iban: row.residentIban,
          emergencyContact: row.residentEmergencyContact,
          source: row.residentSource,
        });

        const today = new Date();
        const contractEnd = row.contractEndDate;
        const checkOut = row.checkOutDate;
        const isCompleted = checkOut && checkOut < today;

        await this.bookingRepo.save({
          bedId: bed.id,
          residentId: resident.id,
          checkInDate: row.checkInDate,
          contractEndDate: contractEnd,
          checkOutDate: checkOut,
          depositAmount: row.depositAmount,
          rentAmount: row.rentAmount,
          isHeadResident: row.residentIsHead,
          isTemporary: false,
          status: isCompleted ? 'completed' : 'active',
          comments: row.comments,
        });
      }

      // Create temporary/upcoming resident booking if present
      const tempName = row.tempResidentName;
      if (tempName && tempName.toLowerCase() !== 'new resident' && tempName.toLowerCase() !== 'resident full name') {
        const tempResident = await this.residentRepo.save({
          fullName: tempName,
          email: row.tempResidentEmail,
          telephone: row.tempResidentTelephone,
          nationality: row.tempResidentNationality,
          personalId: row.tempResidentPersonalId,
          iban: row.tempResidentIban,
          emergencyContact: row.tempResidentEmergencyContact,
          source: row.tempResidentSource,
        });

        await this.bookingRepo.save({
          bedId: bed.id,
          residentId: tempResident.id,
          checkInDate: row.tempCheckInDate,
          contractEndDate: row.tempContractEndDate,
          depositAmount: row.tempDepositAmount ?? 0,
          rentAmount: row.tempRentAmount ?? 0,
          isHeadResident: row.tempResidentIsHead,
          isTemporary: true,
          status: 'upcoming',
          comments: null,
        });
      }

      imported++;
    }

    return { imported };
  }
}
