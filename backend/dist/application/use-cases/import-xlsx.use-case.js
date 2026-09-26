"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ImportXlsxUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportXlsxUseCase = void 0;
const common_1 = require("@nestjs/common");
const xlsx_parser_1 = require("../../infrastructure/parsers/xlsx.parser");
const property_repository_1 = require("../../domain/property/property.repository");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const resident_repository_1 = require("../../domain/resident/resident.repository");
const booking_repository_1 = require("../../domain/booking/booking.repository");
const bedroom_repository_1 = require("../../domain/bedroom/bedroom.repository");
function mapGender(sex) {
    const s = sex?.trim().toUpperCase();
    if (s === 'M')
        return 'Male';
    if (s === 'F')
        return 'Female';
    return null;
}
let ImportXlsxUseCase = ImportXlsxUseCase_1 = class ImportXlsxUseCase {
    constructor(propertyRepo, bedRepo, residentRepo, bookingRepo, bedroomRepo) {
        this.propertyRepo = propertyRepo;
        this.bedRepo = bedRepo;
        this.residentRepo = residentRepo;
        this.bookingRepo = bookingRepo;
        this.bedroomRepo = bedroomRepo;
        this.logger = new common_1.Logger(ImportXlsxUseCase_1.name);
    }
    async execute(buffer) {
        const rows = (0, xlsx_parser_1.parseXlsx)(buffer);
        const propertyStatuses = (0, xlsx_parser_1.parsePropertyStatuses)(buffer);
        let imported = 0;
        let skipped = 0;
        const skipReasons = [];
        const skip = (identifier, reason) => {
            skipped++;
            skipReasons.push({ identifier, reason });
            this.logger.warn(`[import-xlsx] skip ${identifier}: ${reason}`);
        };
        const bedroomCache = new Map();
        for (const row of rows) {
            if (row.bedNumber === null) {
                if (row.bedNumberRaw) {
                    skip(row.code, `Unrecognized bed number "${row.bedNumberRaw}" (expected digits with optional trailing letter, e.g. "12B")`);
                }
                continue;
            }
            const { bed } = await this.upsertPropertyAndBed(row, bedroomCache, propertyStatuses);
            await this.bookingRepo.deleteByBedId(bed.id);
            const currentName = row.residentName;
            if (currentName && currentName.toLowerCase() !== 'resident full name') {
                const resident = await this.upsertResident({
                    fullName: currentName,
                    email: row.residentEmail,
                    telephone: row.residentTelephone,
                    nationality: row.residentNationality,
                    personalId: row.residentPersonalId,
                    iban: row.residentIban,
                    emergencyContact: row.residentEmergencyContact,
                    source: row.residentSource,
                    gender: mapGender(row.sex),
                });
                const today = new Date();
                const contractEnd = row.contractEndDate;
                const checkOut = row.checkOutDate;
                const isCompleted = checkOut && checkOut < today;
                const bookingStatus = isCompleted ? 'completed' : 'active';
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
                    status: bookingStatus,
                    comments: row.comments,
                });
                if (bookingStatus === 'active') {
                    await this.bedRepo.save({ id: bed.id, status: 'allocated' });
                }
            }
            const tempName = row.tempResidentName;
            if (tempName && tempName.toLowerCase() !== 'new resident' && tempName.toLowerCase() !== 'resident full name') {
                const tempResident = await this.upsertResident({
                    fullName: tempName,
                    email: row.tempResidentEmail,
                    telephone: row.tempResidentTelephone,
                    nationality: row.tempResidentNationality,
                    personalId: row.tempResidentPersonalId,
                    iban: row.tempResidentIban,
                    emergencyContact: row.tempResidentEmergencyContact,
                    source: row.tempResidentSource,
                    gender: mapGender(row.sex),
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
        const historicalImported = await this.importCheckedOut(buffer, bedroomCache, propertyStatuses, skip);
        return { imported, historicalImported, skipped, skipReasons };
    }
    async importCheckedOut(buffer, bedroomCache, propertyStatuses, skip) {
        const rows = (0, xlsx_parser_1.parseXlsx)(buffer, 'CheckedOut', false);
        let imported = 0;
        for (const row of rows) {
            const residentName = row.residentName;
            if (!residentName || residentName.toLowerCase() === 'resident full name')
                continue;
            if (!row.checkOutDate)
                continue;
            if (row.bedNumber === null) {
                if (row.bedNumberRaw) {
                    skip(row.code, `[CheckedOut] Unrecognized bed number "${row.bedNumberRaw}" (expected digits with optional trailing letter, e.g. "12B")`);
                }
                continue;
            }
            const { bed } = await this.upsertPropertyAndBed(row, bedroomCache, propertyStatuses);
            const existingBookings = await this.bookingRepo.findByBedId(bed.id);
            const alreadyImported = existingBookings.some(b => b.status === 'completed' &&
                dateKey(b.checkInDate) === dateKey(row.checkInDate) &&
                dateKey(b.checkOutDate) === dateKey(row.checkOutDate));
            if (alreadyImported)
                continue;
            const resident = await this.upsertResident({
                fullName: residentName,
                email: row.residentEmail,
                telephone: row.residentTelephone,
                nationality: row.residentNationality,
                personalId: row.residentPersonalId,
                iban: row.residentIban,
                emergencyContact: row.residentEmergencyContact,
                source: row.residentSource,
                gender: mapGender(row.sex),
            });
            await this.bookingRepo.save({
                bedId: bed.id,
                residentId: resident.id,
                checkInDate: row.checkInDate,
                contractEndDate: row.contractEndDate,
                checkOutDate: row.checkOutDate,
                depositAmount: row.depositAmount,
                rentAmount: row.rentAmount,
                isHeadResident: row.residentIsHead,
                isTemporary: false,
                status: 'completed',
                comments: row.comments,
            });
            imported++;
        }
        return imported;
    }
    async upsertPropertyAndBed(row, bedroomCache, propertyStatuses) {
        const property = await this.propertyRepo.upsertByCode({
            code: row.code,
            eirCode: row.eirCode,
            bu: row.bu,
            area: row.area,
            fullAddress: row.fullAddress,
            keysCount: row.keysCount,
            securityKeysCount: row.securityKeysCount,
            fobCount: row.fobCount,
            electricityStatus: row.electricityStatus,
            gasStatus: row.gasStatus,
            landlordPaymentDueDay: row.landlordPaymentDueDay,
            residentPaymentDueDay: row.residentPaymentDueDay,
            active: propertyStatuses.get(row.code) ?? true,
        });
        const bedroomId = row.bedroomLetter
            ? await this.ensureBedroom(property.id, row.bedroomLetter, bedroomCache)
            : null;
        const bed = await this.bedRepo.upsertByPropertyAndNumber({
            propertyId: property.id,
            bedNumber: row.bedNumber,
            bedroomId,
            bedroomType: row.bedroomType,
            sex: row.sex,
            bedSize: row.bedSize,
            depositAmount: row.depositAmount,
            rentAmount: row.rentAmount,
        });
        return { property, bed };
    }
    async upsertResident(data) {
        const existing = (data.email && (await this.residentRepo.findByEmail(data.email))) ||
            (data.telephone && (await this.residentRepo.findByTelephone(data.telephone))) ||
            null;
        return existing
            ? this.residentRepo.save({ ...data, id: existing.id })
            : this.residentRepo.save(data);
    }
    async ensureBedroom(propertyId, letter, cache) {
        const cacheKey = `${propertyId}:${letter}`;
        const cached = cache.get(cacheKey);
        if (cached)
            return cached;
        const name = `Bedroom ${letter}`;
        const existing = await this.bedroomRepo.findByPropertyAndName(propertyId, name);
        const bedroom = existing ?? (await this.bedroomRepo.save({ propertyId, name, active: true }));
        cache.set(cacheKey, bedroom.id);
        return bedroom.id;
    }
};
exports.ImportXlsxUseCase = ImportXlsxUseCase;
exports.ImportXlsxUseCase = ImportXlsxUseCase = ImportXlsxUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(property_repository_1.PROPERTY_REPOSITORY)),
    __param(1, (0, common_1.Inject)(bed_repository_1.BED_REPOSITORY)),
    __param(2, (0, common_1.Inject)(resident_repository_1.RESIDENT_REPOSITORY)),
    __param(3, (0, common_1.Inject)(booking_repository_1.BOOKING_REPOSITORY)),
    __param(4, (0, common_1.Inject)(bedroom_repository_1.BEDROOM_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object])
], ImportXlsxUseCase);
function dateKey(d) {
    if (!d)
        return null;
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
//# sourceMappingURL=import-xlsx.use-case.js.map