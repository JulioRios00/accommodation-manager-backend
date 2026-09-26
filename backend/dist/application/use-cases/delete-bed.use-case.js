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
exports.DeleteBedUseCase = void 0;
const common_1 = require("@nestjs/common");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const booking_repository_1 = require("../../domain/booking/booking.repository");
const audit_log_service_1 = require("../services/audit-log.service");
let DeleteBedUseCase = class DeleteBedUseCase {
    constructor(bedRepo, bookingRepo, auditLog) {
        this.bedRepo = bedRepo;
        this.bookingRepo = bookingRepo;
        this.auditLog = auditLog;
    }
    async execute(id, actor) {
        const existing = await this.bedRepo.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`Bed ${id} not found`);
        await this.bookingRepo.deleteByBedId(id);
        await this.bedRepo.delete(id);
        await this.auditLog.record({
            actor,
            action: 'delete',
            entityType: 'Bed',
            entityId: id,
            before: existing,
        });
    }
};
exports.DeleteBedUseCase = DeleteBedUseCase;
exports.DeleteBedUseCase = DeleteBedUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(bed_repository_1.BED_REPOSITORY)),
    __param(1, (0, common_1.Inject)(booking_repository_1.BOOKING_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, audit_log_service_1.AuditLogService])
], DeleteBedUseCase);
//# sourceMappingURL=delete-bed.use-case.js.map