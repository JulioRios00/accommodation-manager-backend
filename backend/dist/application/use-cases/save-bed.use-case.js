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
exports.SaveBedUseCase = void 0;
const common_1 = require("@nestjs/common");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const bedroom_repository_1 = require("../../domain/bedroom/bedroom.repository");
const bed_rate_history_repository_1 = require("../../domain/bed-rate-history/bed-rate-history.repository");
const audit_log_service_1 = require("../services/audit-log.service");
let SaveBedUseCase = class SaveBedUseCase {
    constructor(repo, bedroomRepo, rateHistoryRepo, auditLog) {
        this.repo = repo;
        this.bedroomRepo = bedroomRepo;
        this.rateHistoryRepo = rateHistoryRepo;
        this.auditLog = auditLog;
    }
    async execute(dto, actor) {
        if (dto.rentAmount !== undefined && dto.rentAmount < 0) {
            throw new common_1.BadRequestException('rentAmount must be >= 0');
        }
        if (dto.depositAmount !== undefined && dto.depositAmount < 0) {
            throw new common_1.BadRequestException('depositAmount must be >= 0');
        }
        if (dto.bedroomId) {
            const bedroom = await this.bedroomRepo.findById(dto.bedroomId);
            if (!bedroom)
                throw new common_1.NotFoundException(`Bedroom ${dto.bedroomId} not found`);
            if (bedroom.propertyId !== dto.propertyId) {
                throw new common_1.BadRequestException('Bedroom does not belong to this property');
            }
        }
        let existing = null;
        let bed;
        if (dto.id) {
            existing = await this.repo.findById(dto.id);
            if (!existing)
                throw new common_1.NotFoundException(`Bed ${dto.id} not found`);
            bed = await this.repo.save(dto);
        }
        else {
            bed = await this.repo.save({ ...dto, status: 'vacant' });
        }
        const rateChanged = !existing || existing.rentAmount !== bed.rentAmount || existing.depositAmount !== bed.depositAmount;
        if (rateChanged) {
            await this.rateHistoryRepo.save({
                bedId: bed.id,
                rentAmount: bed.rentAmount,
                depositAmount: bed.depositAmount,
                effectiveFrom: new Date(),
            });
        }
        await this.auditLog.record({
            actor,
            action: existing ? 'update' : 'create',
            entityType: 'Bed',
            entityId: bed.id,
            before: existing,
            after: bed,
        });
        return bed;
    }
};
exports.SaveBedUseCase = SaveBedUseCase;
exports.SaveBedUseCase = SaveBedUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(bed_repository_1.BED_REPOSITORY)),
    __param(1, (0, common_1.Inject)(bedroom_repository_1.BEDROOM_REPOSITORY)),
    __param(2, (0, common_1.Inject)(bed_rate_history_repository_1.BED_RATE_HISTORY_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, Object, audit_log_service_1.AuditLogService])
], SaveBedUseCase);
//# sourceMappingURL=save-bed.use-case.js.map