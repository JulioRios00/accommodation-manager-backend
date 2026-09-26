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
exports.ResidentsController = void 0;
const common_1 = require("@nestjs/common");
const get_residents_use_case_1 = require("../../application/use-cases/get-residents.use-case");
const save_resident_use_case_1 = require("../../application/use-cases/save-resident.use-case");
const delete_resident_use_case_1 = require("../../application/use-cases/delete-resident.use-case");
const roles_decorator_1 = require("../decorators/roles.decorator");
const current_actor_decorator_1 = require("../decorators/current-actor.decorator");
let ResidentsController = class ResidentsController {
    constructor(getResidents, saveResident, deleteResident) {
        this.getResidents = getResidents;
        this.saveResident = saveResident;
        this.deleteResident = deleteResident;
    }
    async findAll() {
        return this.getResidents.execute();
    }
    async create(dto, actor) {
        return this.saveResident.execute(dto, actor);
    }
    async update(id, dto, actor) {
        return this.saveResident.execute({ ...dto, id }, actor);
    }
    async remove(id, actor) {
        await this.deleteResident.execute(id, actor);
    }
};
exports.ResidentsController = ResidentsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "remove", null);
exports.ResidentsController = ResidentsController = __decorate([
    (0, common_1.Controller)('residents'),
    __metadata("design:paramtypes", [get_residents_use_case_1.GetResidentsUseCase,
        save_resident_use_case_1.SaveResidentUseCase,
        delete_resident_use_case_1.DeleteResidentUseCase])
], ResidentsController);
//# sourceMappingURL=residents.controller.js.map