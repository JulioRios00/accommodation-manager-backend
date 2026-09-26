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
var ImportController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const import_jobs_service_1 = require("../../application/services/import-jobs.service");
const import_xlsx_use_case_1 = require("../../application/use-cases/import-xlsx.use-case");
const import_bills_use_case_1 = require("../../application/use-cases/import-bills.use-case");
const import_maintenance_use_case_1 = require("../../application/use-cases/import-maintenance.use-case");
const import_deposits_use_case_1 = require("../../application/use-cases/import-deposits.use-case");
const import_landlord_payments_use_case_1 = require("../../application/use-cases/import-landlord-payments.use-case");
const import_resident_payments_use_case_1 = require("../../application/use-cases/import-resident-payments.use-case");
const import_residents_to_clerk_use_case_1 = require("../../application/use-cases/import-residents-to-clerk.use-case");
const roles_decorator_1 = require("../decorators/roles.decorator");
const fileGuard = (file) => {
    if (!file)
        throw new common_1.BadRequestException('No file provided');
};
const summarizeSkips = (skipReasons) => {
    if (!skipReasons.length)
        return '';
    const counts = new Map();
    for (const { reason } of skipReasons) {
        const category = reason.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
        counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `${count} ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`)
        .join(', ');
};
let ImportController = ImportController_1 = class ImportController {
    constructor(importJobs, importXlsxUseCase, importBillsUseCase, importMaintenanceUseCase, importDepositsUseCase, importLandlordPaymentsUseCase, importResidentPaymentsUseCase, importResidentsToClerkUseCase) {
        this.importJobs = importJobs;
        this.importXlsxUseCase = importXlsxUseCase;
        this.importBillsUseCase = importBillsUseCase;
        this.importMaintenanceUseCase = importMaintenanceUseCase;
        this.importDepositsUseCase = importDepositsUseCase;
        this.importLandlordPaymentsUseCase = importLandlordPaymentsUseCase;
        this.importResidentPaymentsUseCase = importResidentPaymentsUseCase;
        this.importResidentsToClerkUseCase = importResidentsToClerkUseCase;
        this.logger = new common_1.Logger(ImportController_1.name);
    }
    importAccommodation(file) {
        fileGuard(file);
        const job = this.importJobs.create();
        this.importXlsxUseCase
            .execute(file.buffer)
            .then((result) => {
            const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
            this.importJobs.complete(job.id, {
                message: `Imported ${result.imported} beds, ${result.historicalImported} historical (checked-out) bookings (${result.skipped} skipped${skipNote})`,
                ...result,
            });
        })
            .catch((err) => {
            this.logger.error(`[import] job ${job.id} failed: ${err?.message}`, err?.stack);
            this.importJobs.fail(job.id, err?.message ?? 'Import failed');
        });
        return { jobId: job.id };
    }
    getImportStatus(jobId) {
        const job = this.importJobs.get(jobId);
        if (!job)
            throw new common_1.NotFoundException('Import job not found');
        return job;
    }
    async importBills(file) {
        fileGuard(file);
        const result = await this.importBillsUseCase.execute(file.buffer);
        const gprnNote = result.gprnConflicts ? `, ${result.gprnConflicts} GPRN conflicts kept previous value` : '';
        const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
        return { message: `Updated ${result.updated} property utility records (${result.skipped} skipped${gprnNote}${skipNote})`, ...result };
    }
    async importMaintenance(file) {
        fileGuard(file);
        const result = await this.importMaintenanceUseCase.execute(file.buffer);
        const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
        return { message: `Imported ${result.imported} maintenance tickets (${result.skipped} skipped${skipNote})`, ...result };
    }
    async importDeposits(file) {
        fileGuard(file);
        const result = await this.importDepositsUseCase.execute(file.buffer);
        const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
        return { message: `Imported ${result.imported} deposit transactions (${result.skipped} skipped${skipNote})`, ...result };
    }
    async importLandlordPayments(file) {
        fileGuard(file);
        const result = await this.importLandlordPaymentsUseCase.execute(file.buffer);
        const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
        return { message: `Imported ${result.imported} landlord payments (${result.skipped} skipped${skipNote})`, ...result };
    }
    async importResidentPayments(file) {
        fileGuard(file);
        const result = await this.importResidentPaymentsUseCase.execute(file.buffer);
        const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
        return { message: `Imported ${result.imported} resident payments (${result.skipped} skipped${skipNote})`, ...result };
    }
    async importResidentsToClerk(file) {
        fileGuard(file);
        const result = await this.importResidentsToClerkUseCase.execute(file.buffer);
        return {
            message: `Clerk provisioning complete — ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`,
            ...result,
        };
    }
};
exports.ImportController = ImportController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportController.prototype, "importAccommodation", null);
__decorate([
    (0, common_1.Get)('status/:jobId'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImportController.prototype, "getImportStatus", null);
__decorate([
    (0, common_1.Post)('bills'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importBills", null);
__decorate([
    (0, common_1.Post)('maintenance'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importMaintenance", null);
__decorate([
    (0, common_1.Post)('deposits'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importDeposits", null);
__decorate([
    (0, common_1.Post)('landlord-payments'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importLandlordPayments", null);
__decorate([
    (0, common_1.Post)('resident-payments'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importResidentPayments", null);
__decorate([
    (0, common_1.Post)('residents-clerk'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importResidentsToClerk", null);
exports.ImportController = ImportController = ImportController_1 = __decorate([
    (0, common_1.Controller)('import'),
    __metadata("design:paramtypes", [import_jobs_service_1.ImportJobsService,
        import_xlsx_use_case_1.ImportXlsxUseCase,
        import_bills_use_case_1.ImportBillsUseCase,
        import_maintenance_use_case_1.ImportMaintenanceUseCase,
        import_deposits_use_case_1.ImportDepositsUseCase,
        import_landlord_payments_use_case_1.ImportLandlordPaymentsUseCase,
        import_resident_payments_use_case_1.ImportResidentPaymentsUseCase,
        import_residents_to_clerk_use_case_1.ImportResidentsToClerkUseCase])
], ImportController);
//# sourceMappingURL=import.controller.js.map