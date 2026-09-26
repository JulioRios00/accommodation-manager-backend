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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingTypeOrmRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../../../../domain/booking/booking.entity");
const booking_orm_entity_1 = require("../entities/booking.orm-entity");
let BookingTypeOrmRepository = class BookingTypeOrmRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll(status) {
        const where = status ? { status, active: true } : { active: true };
        const entities = await this.repo.find({
            where,
            relations: ['bed', 'bed.property', 'bed.bedroom', 'resident'],
        });
        return entities.map(this.toDomain);
    }
    async findById(id) {
        const entity = await this.repo.findOne({
            where: { id, active: true },
            relations: ['bed', 'bed.property', 'bed.bedroom', 'resident'],
        });
        return entity ? this.toDomain(entity) : null;
    }
    async findByBedId(bedId) {
        const entities = await this.repo.find({
            where: { bedId, active: true },
            relations: ['resident'],
        });
        return entities.map(this.toDomain);
    }
    async findActiveByResidentId(residentId) {
        const entity = await this.repo.findOne({
            where: { residentId, status: 'active', active: true },
            relations: ['bed', 'bed.property', 'bed.bedroom'],
        });
        return entity ? this.toDomain(entity) : null;
    }
    async findAllActiveByResidentId(residentId) {
        const entities = await this.repo.find({
            where: { residentId, status: 'active', active: true },
            relations: ['bed', 'bed.property', 'bed.bedroom'],
        });
        return entities.map(this.toDomain);
    }
    async findOverlappingActive(bedId, startDate, endDate, excludeId) {
        const qb = this.repo.createQueryBuilder('b')
            .where('b.bedId = :bedId', { bedId })
            .andWhere('b.active = true')
            .andWhere("b.status IN ('active', 'upcoming')")
            .andWhere('b.checkInDate < :endDate', { endDate })
            .andWhere('(COALESCE(b.checkOutDate, b.contractEndDate) > :startDate OR (b.checkOutDate IS NULL AND b.contractEndDate IS NULL))', { startDate });
        if (excludeId) {
            qb.andWhere('b.id != :excludeId', { excludeId });
        }
        return (await qb.getMany()).map(this.toDomain);
    }
    async save(booking) {
        const entity = this.repo.create(booking);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }
    async deleteByBedId(bedId) {
        await this.repo.update({ bedId }, { active: false });
    }
    async delete(id) {
        await this.repo.update(id, { active: false });
    }
    toDomain(entity) {
        const b = new booking_entity_1.Booking();
        b.id = entity.id;
        b.bedId = entity.bedId;
        b.residentId = entity.residentId;
        b.checkInDate = entity.checkInDate;
        b.contractEndDate = entity.contractEndDate;
        b.checkOutDate = entity.checkOutDate;
        b.depositAmount = Number(entity.depositAmount);
        b.rentAmount = Number(entity.rentAmount);
        b.isHeadResident = entity.isHeadResident;
        b.isTemporary = entity.isTemporary;
        b.status = entity.status;
        b.comments = entity.comments;
        b.createdAt = entity.createdAt;
        b.updatedAt = entity.updatedAt;
        b.bed = entity.bed
            ? {
                id: entity.bed.id,
                bedNumber: entity.bed.bedNumber,
                name: entity.bed.name ?? null,
                bedroomType: entity.bed.bedroomType,
                bedroomName: entity.bed.bedroom?.name ?? null,
                propertyId: entity.bed.propertyId,
                propertyCode: entity.bed.property?.code ?? null,
            }
            : null;
        b.resident = entity.resident
            ? {
                id: entity.resident.id,
                fullName: entity.resident.fullName,
                email: entity.resident.email ?? null,
                telephone: entity.resident.telephone ?? null,
            }
            : null;
        return b;
    }
};
exports.BookingTypeOrmRepository = BookingTypeOrmRepository;
exports.BookingTypeOrmRepository = BookingTypeOrmRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_orm_entity_1.BookingOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BookingTypeOrmRepository);
//# sourceMappingURL=booking.typeorm-repository.js.map