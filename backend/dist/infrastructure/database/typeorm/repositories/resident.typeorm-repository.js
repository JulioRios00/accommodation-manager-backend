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
exports.ResidentTypeOrmRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const resident_entity_1 = require("../../../../domain/resident/resident.entity");
const resident_orm_entity_1 = require("../entities/resident.orm-entity");
let ResidentTypeOrmRepository = class ResidentTypeOrmRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll() {
        const entities = await this.repo.find({ where: { active: true } });
        return entities.map(this.toDomain);
    }
    async findById(id) {
        const entity = await this.repo.findOne({ where: { id, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async save(resident) {
        const entity = this.repo.create(resident);
        const saved = await this.repo.save(entity);
        return this.toDomain(saved);
    }
    async findByEmail(email) {
        const entity = await this.repo.findOne({ where: { email, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByTelephone(telephone) {
        const entity = await this.repo.findOne({ where: { telephone, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async findByClerkUserId(clerkUserId) {
        const entity = await this.repo.findOne({ where: { clerkUserId, active: true } });
        return entity ? this.toDomain(entity) : null;
    }
    async delete(id) {
        await this.repo.update(id, { active: false });
    }
    toDomain(entity) {
        const r = new resident_entity_1.Resident();
        r.id = entity.id;
        r.clerkUserId = entity.clerkUserId ?? null;
        r.fullName = entity.fullName;
        r.email = entity.email;
        r.telephone = entity.telephone;
        r.gender = entity.gender ?? null;
        r.nationality = entity.nationality;
        r.personalId = entity.personalId;
        r.iban = entity.iban;
        r.emergencyContact = entity.emergencyContact;
        r.source = entity.source;
        r.paymentDueDay = entity.paymentDueDay ?? null;
        r.comments = entity.comments ?? null;
        r.delinquent = entity.delinquent ?? false;
        r.hasObservation = entity.hasObservation ?? false;
        r.observation = entity.observation ?? null;
        r.createdAt = entity.createdAt;
        r.updatedAt = entity.updatedAt;
        return r;
    }
};
exports.ResidentTypeOrmRepository = ResidentTypeOrmRepository;
exports.ResidentTypeOrmRepository = ResidentTypeOrmRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(resident_orm_entity_1.ResidentOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ResidentTypeOrmRepository);
//# sourceMappingURL=resident.typeorm-repository.js.map