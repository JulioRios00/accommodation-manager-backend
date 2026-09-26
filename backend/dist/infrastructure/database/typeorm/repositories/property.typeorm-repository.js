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
exports.PropertyTypeOrmRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const property_entity_1 = require("../../../../domain/property/property.entity");
const property_orm_entity_1 = require("../entities/property.orm-entity");
let PropertyTypeOrmRepository = class PropertyTypeOrmRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll(includeInactive = false) {
        const entities = await this.repo.find({
            where: includeInactive ? {} : { active: true },
            relations: ['beds'],
        });
        return entities.map(this.toDomain);
    }
    async findById(id) {
        const entity = await this.repo.findOne({ where: { id, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByIdAnyStatus(id) {
        const entity = await this.repo.findOne({ where: { id } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByCode(code) {
        const entity = await this.repo.findOne({ where: { code, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByMprn(mprn) {
        const entity = await this.repo.findOne({ where: { electricityMprn: mprn, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByGprn(gprn) {
        const entity = await this.repo.findOne({ where: { gasGprn: gprn, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async save(property) {
        const entity = this.repo.create(property);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }
    async delete(id) {
        await this.repo.update(id, { active: false });
    }
    async upsertByCode(property) {
        const active = property.active ?? true;
        let entity = await this.repo.findOne({ where: { code: property.code } });
        if (entity) {
            Object.assign(entity, property, { active });
        }
        else {
            entity = this.repo.create({ ...property, active });
        }
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }
    async findByCodeAnyStatus(code) {
        const entity = await this.repo.findOne({ where: { code } });
        return entity ? this.toDomain(entity) : null;
    }
    toDomain(entity) {
        const p = new property_entity_1.Property();
        p.id = entity.id;
        p.code = entity.code;
        p.bu = entity.bu;
        p.area = entity.area;
        p.fullAddress = entity.fullAddress;
        p.officeKeysCount = entity.officeKeysCount ?? 0;
        p.keysCount = entity.keysCount ?? 0;
        p.securityKeysCount = entity.securityKeysCount ?? 0;
        p.fobCount = entity.fobCount ?? 0;
        p.keyCode = entity.keyCode ?? null;
        p.electricityStatus = entity.electricityStatus ?? null;
        p.electricityMprn = entity.electricityMprn ?? null;
        p.electricitySupplier = entity.electricitySupplier ?? null;
        p.electricityAccountNumber = entity.electricityAccountNumber ?? null;
        p.electricityKeypadCode = entity.electricityKeypadCode ?? null;
        p.gasStatus = entity.gasStatus ?? null;
        p.gasGprn = entity.gasGprn ?? null;
        p.gasSupplier = entity.gasSupplier ?? null;
        p.gasAccountNumber = entity.gasAccountNumber ?? null;
        p.gasPin = entity.gasPin ?? null;
        p.wasteSupplier = entity.wasteSupplier ?? null;
        p.wasteAccountNumber = entity.wasteAccountNumber ?? null;
        p.wasteEmail = entity.wasteEmail ?? null;
        p.wastePassword = entity.wastePassword ?? null;
        p.wastePaymentType = entity.wastePaymentType ?? null;
        p.wasteMonthlyAmount = entity.wasteMonthlyAmount ? Number(entity.wasteMonthlyAmount) : null;
        p.wasteStatus = entity.wasteStatus ?? null;
        p.internetSupplier = entity.internetSupplier ?? null;
        p.internetAccountNumber = entity.internetAccountNumber ?? null;
        p.internetEmail = entity.internetEmail ?? null;
        p.internetUsername = entity.internetUsername ?? null;
        p.internetPassword = entity.internetPassword ?? null;
        p.internetPaymentType = entity.internetPaymentType ?? null;
        p.internetStatus = entity.internetStatus ?? null;
        p.internetContractEndDate = entity.internetContractEndDate ?? null;
        p.internetOnlineLink = entity.internetOnlineLink ?? null;
        p.internetBusinessPhone = entity.internetBusinessPhone ?? null;
        p.internetNotes = entity.internetNotes ?? null;
        p.wastePhone = entity.wastePhone ?? null;
        p.salesDescription = entity.salesDescription ?? null;
        p.eirCode = entity.eirCode ?? null;
        p.propertyType = entity.propertyType ?? null;
        p.crn = entity.crn ?? null;
        p.propertyEmail = entity.propertyEmail ?? null;
        p.paymentReference = entity.paymentReference ?? null;
        p.propertySupplier = entity.propertySupplier ?? null;
        p.paymentNotes = entity.paymentNotes ?? null;
        p.landlordPaymentDueDay = entity.landlordPaymentDueDay ?? null;
        p.residentPaymentDueDay = entity.residentPaymentDueDay ?? null;
        p.officeKeysComment = entity.officeKeysComment ?? null;
        p.landlordId = entity.landlordId ?? null;
        p.leaseStartDate = entity.leaseStartDate ?? null;
        p.leaseEndDate = entity.leaseEndDate ?? null;
        p.active = entity.active;
        p.createdAt = entity.createdAt;
        p.updatedAt = entity.updatedAt;
        return p;
    }
};
exports.PropertyTypeOrmRepository = PropertyTypeOrmRepository;
exports.PropertyTypeOrmRepository = PropertyTypeOrmRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(property_orm_entity_1.PropertyOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PropertyTypeOrmRepository);
//# sourceMappingURL=property.typeorm-repository.js.map