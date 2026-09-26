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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const get_bookings_use_case_1 = require("../../application/use-cases/get-bookings.use-case");
const save_booking_use_case_1 = require("../../application/use-cases/save-booking.use-case");
const delete_booking_use_case_1 = require("../../application/use-cases/delete-booking.use-case");
const roles_decorator_1 = require("../decorators/roles.decorator");
const current_actor_decorator_1 = require("../decorators/current-actor.decorator");
let BookingsController = class BookingsController {
    constructor(getBookings, saveBooking, deleteBooking) {
        this.getBookings = getBookings;
        this.saveBooking = saveBooking;
        this.deleteBooking = deleteBooking;
    }
    async findAll(status) {
        return this.getBookings.execute(status);
    }
    async create(dto, actor) {
        return this.saveBooking.execute(dto, actor);
    }
    async update(id, dto, actor) {
        return this.saveBooking.execute({ ...dto, id }, actor);
    }
    async remove(id, actor) {
        await this.deleteBooking.execute(id, actor);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, roles_decorator_1.Roles)('sysadmin', 'manager', 'administrator', 'staff', 'maintenance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_actor_decorator_1.CurrentActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "remove", null);
exports.BookingsController = BookingsController = __decorate([
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [get_bookings_use_case_1.GetBookingsUseCase,
        save_booking_use_case_1.SaveBookingUseCase,
        delete_booking_use_case_1.DeleteBookingUseCase])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map