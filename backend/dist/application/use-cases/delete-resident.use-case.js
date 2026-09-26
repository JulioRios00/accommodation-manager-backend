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
exports.DeleteResidentUseCase = void 0;
const common_1 = require("@nestjs/common");
const resident_repository_1 = require("../../domain/resident/resident.repository");
const audit_log_service_1 = require("../services/audit-log.service");
let DeleteResidentUseCase = class DeleteResidentUseCase {
    constructor(repo, auditLog) {
        this.repo = repo;
        this.auditLog = auditLog;
    }
    async execute(id, actor) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`Resident ${id} not found`);
        await this.repo.delete(id);
        await this.auditLog.record({
            actor,
            action: 'delete',
            entityType: 'Resident',
            entityId: id,
            before: existing,
        });
    }
};
exports.DeleteResidentUseCase = DeleteResidentUseCase;
exports.DeleteResidentUseCase = DeleteResidentUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(resident_repository_1.RESIDENT_REPOSITORY)),
    __metadata("design:paramtypes", [Object, audit_log_service_1.AuditLogService])
], DeleteResidentUseCase);
//# sourceMappingURL=delete-resident.use-case.js.map