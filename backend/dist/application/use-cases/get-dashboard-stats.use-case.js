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
exports.GetDashboardStatsUseCase = void 0;
const common_1 = require("@nestjs/common");
const property_repository_1 = require("../../domain/property/property.repository");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const booking_repository_1 = require("../../domain/booking/booking.repository");
let GetDashboardStatsUseCase = class GetDashboardStatsUseCase {
    constructor(propertyRepo, bedRepo, bookingRepo) {
        this.propertyRepo = propertyRepo;
        this.bedRepo = bedRepo;
        this.bookingRepo = bookingRepo;
    }
    async execute() {
        const [allProperties, beds, activeBookings, upcomingBookings] = await Promise.all([
            this.propertyRepo.findAll(true),
            this.bedRepo.findAll(),
            this.bookingRepo.findAll('active'),
            this.bookingRepo.findAll('upcoming'),
        ]);
        const properties = allProperties.filter((p) => p.active);
        const inactiveProperties = allProperties.length - properties.length;
        const occupiedBedIds = new Set(activeBookings.map((b) => b.bedId));
        const occupiedBeds = occupiedBedIds.size;
        const availableBeds = beds.length - occupiedBeds;
        const today = Date.now();
        const onRadarBeds = activeBookings.filter((b) => {
            if (!b.contractEndDate)
                return false;
            const daysUntilEnd = (new Date(b.contractEndDate).getTime() - today) / 86400000;
            return daysUntilEnd >= 0 && daysUntilEnd <= 38;
        }).length;
        const totalBeds = beds.length;
        const occupancyRate = totalBeds > 0
            ? Math.round((occupiedBeds / totalBeds) * 1000) / 10
            : 0;
        const monthlyRevenue = activeBookings.reduce((sum, b) => sum + (b.rentAmount ?? 0), 0);
        const upcomingRevenue = upcomingBookings.reduce((sum, b) => sum + (b.rentAmount ?? 0), 0);
        const projectedRevenue = monthlyRevenue + upcomingRevenue;
        return {
            totalProperties: properties.length,
            inactiveProperties,
            totalBeds,
            occupiedBeds,
            availableBeds,
            onRadarBeds,
            occupancyRate,
            monthlyRevenue,
            projectedRevenue,
        };
    }
};
exports.GetDashboardStatsUseCase = GetDashboardStatsUseCase;
exports.GetDashboardStatsUseCase = GetDashboardStatsUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(property_repository_1.PROPERTY_REPOSITORY)),
    __param(1, (0, common_1.Inject)(bed_repository_1.BED_REPOSITORY)),
    __param(2, (0, common_1.Inject)(booking_repository_1.BOOKING_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, Object])
], GetDashboardStatsUseCase);
//# sourceMappingURL=get-dashboard-stats.use-case.js.map