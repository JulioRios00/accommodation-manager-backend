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
exports.BedTypeOrmRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bed_entity_1 = require("../../../../domain/bed/bed.entity");
const bed_orm_entity_1 = require("../entities/bed.orm-entity");
let BedTypeOrmRepository = class BedTypeOrmRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll(propertyId) {
        const where = propertyId ? { propertyId, active: true } : { active: true };
        const entities = await this.repo.find({ where, relations: ['property', 'bedroom'] });
        return entities.map(this.toDomain);
    }
    async findById(id) {
        const entity = await this.repo.findOne({ where: { id, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByPropertyAndNumber(propertyId, bedNumber) {
        const entity = await this.repo.findOne({ where: { propertyId, bedNumber, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async save(bed) {
        const entity = this.repo.create(bed);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }
    async delete(id) {
        await this.repo.update(id, { active: false });
    }
    async deleteByPropertyId(propertyId) {
        await this.repo.update({ propertyId }, { active: false });
    }
    async upsertByPropertyAndNumber(bed) {
        let entity = await this.repo.findOne({
            where: bed.bedroomId
                ? { propertyId: bed.propertyId, bedroomId: bed.bedroomId, bedNumber: bed.bedNumber }
                : { propertyId: bed.propertyId, bedNumber: bed.bedNumber },
        });
        if (entity) {
            const bedroomId = bed.bedroomId ?? entity.bedroomId;
            Object.assign(entity, bed, { bedroomId, active: true });
        }
        else {
            entity = this.repo.create({ ...bed, active: true });
        }
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }
    toDomain(entity) {
        const b = new bed_entity_1.Bed();
        b.id = entity.id;
        b.propertyId = entity.propertyId;
        b.propertyCode = entity.property?.code;
        b.bedNumber = entity.bedNumber;
        b.bedroomId = entity.bedroomId ?? null;
        b.bedroomName = entity.bedroom?.name ?? null;
        b.name = entity.name ?? null;
        b.position = entity.position ?? null;
        b.status = (entity.status ?? 'vacant');
        b.bedroomType = entity.bedroomType;
        b.sex = entity.sex;
        b.bedSize = entity.bedSize;
        b.depositAmount = Number(entity.depositAmount);
        b.rentAmount = Number(entity.rentAmount);
        b.active = entity.active;
        b.createdAt = entity.createdAt;
        b.updatedAt = entity.updatedAt;
        return b;
    }
};
exports.BedTypeOrmRepository = BedTypeOrmRepository;
exports.BedTypeOrmRepository = BedTypeOrmRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bed_orm_entity_1.BedOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BedTypeOrmRepository);
//# sourceMappingURL=bed.typeorm-repository.js.map