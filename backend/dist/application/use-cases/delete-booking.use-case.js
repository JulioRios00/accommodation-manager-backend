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
exports.DeleteBookingUseCase = void 0;
const common_1 = require("@nestjs/common");
const booking_repository_1 = require("../../domain/booking/booking.repository");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const audit_log_service_1 = require("../services/audit-log.service");
let DeleteBookingUseCase = class DeleteBookingUseCase {
    constructor(repo, bedRepo, auditLog) {
        this.repo = repo;
        this.bedRepo = bedRepo;
        this.auditLog = auditLog;
    }
    async execute(id, actor) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`Booking ${id} not found`);
        await this.repo.delete(id);
        const remaining = await this.repo.findByBedId(existing.bedId);
        const hasActive = remaining.some((b) => b.id !== id && b.status === 'active');
        if (!hasActive) {
            await this.bedRepo.save({ id: existing.bedId, status: 'vacant' });
        }
        await this.auditLog.record({
            actor,
            action: 'delete',
            entityType: 'Booking',
            entityId: id,
            before: existing,
        });
    }
};
exports.DeleteBookingUseCase = DeleteBookingUseCase;
exports.DeleteBookingUseCase = DeleteBookingUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(booking_repository_1.BOOKING_REPOSITORY)),
    __param(1, (0, common_1.Inject)(bed_repository_1.BED_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, audit_log_service_1.AuditLogService])
], DeleteBookingUseCase);
//# sourceMappingURL=delete-booking.use-case.js.map