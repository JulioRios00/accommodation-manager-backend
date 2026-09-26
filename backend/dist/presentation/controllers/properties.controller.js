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
exports.PropertiesController = void 0;
const common_1 = require("@nestjs/common");
const get_properties_use_case_1 = require("../../application/use-cases/get-properties.use-case");
const save_property_use_case_1 = require("../../application/use-cases/save-property.use-case");
const delete_property_use_case_1 = require("../../application/use-cases/delete-property.use-case");
const hard_delete_property_use_case_1 = require("../../application/use-cases/hard-delete-property.use-case");
const roles_decorator_1 = require("../decorators/roles.decorator");
const current_actor_decorator_1 = require("../decorators/current-actor.decorator");
let PropertiesController = class PropertiesController {
    constructor(getProperties, saveProperty, deleteProperty, hardDeleteProperty) {
        this.getProperties = getProperties;
        this.saveProperty = saveProperty;
        this.deleteProperty = deleteProperty;
        this.hardDeleteProperty = hardDeleteProperty;
    }
    async findAll(includeInactive) {
        return this.getProperties.execute(includeInactive === 'true');
    }
    async create(dto, actor) {
        return this.saveProperty.execute(dto, actor);
    }
    async update(id, dto, actor) {
        return this.saveProperty.execute({ ...dto, id }, actor);
    }
    async remove(id, actor) {
        await this.deleteProperty.execute(id, actor);
    }
    async removeHard(id) {
        await this.hardDeleteProperty.execute(id);
    }
};
exports.PropertiesController = PropertiesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)(':id/hard'),
    (0, common_1.HttpCode)(204),
    (0, roles_decorator_1.Roles)('sysadmin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "removeHard", null);
exports.PropertiesController = PropertiesController = __decorate([
    (0, common_1.Controller)('properties'),
    __metadata("design:paramtypes", [get_properties_use_case_1.GetPropertiesUseCase,
        save_property_use_case_1.SavePropertyUseCase,
        delete_property_use_case_1.DeletePropertyUseCase,
        hard_delete_property_use_case_1.HardDeletePropertyUseCase])
], PropertiesController);
//# sourceMappingURL=properties.controller.js.map