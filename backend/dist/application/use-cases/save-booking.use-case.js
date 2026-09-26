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
exports.SaveBookingUseCase = void 0;
const common_1 = require("@nestjs/common");
const booking_repository_1 = require("../../domain/booking/booking.repository");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const resident_repository_1 = require("../../domain/resident/resident.repository");
const rent_payment_repository_1 = require("../../domain/rent-payment/rent-payment.repository");
const bed_rate_history_repository_1 = require("../../domain/bed-rate-history/bed-rate-history.repository");
const audit_log_service_1 = require("../services/audit-log.service");
let SaveBookingUseCase = class SaveBookingUseCase {
    constructor(repo, bedRepo, residentRepo, rentPaymentRepo, rateHistoryRepo, auditLog) {
        this.repo = repo;
        this.bedRepo = bedRepo;
        this.residentRepo = residentRepo;
        this.rentPaymentRepo = rentPaymentRepo;
        this.rateHistoryRepo = rateHistoryRepo;
        this.auditLog = auditLog;
    }
    async execute(dto, actor) {
        const bed = await this.bedRepo.findById(dto.bedId);
        if (!bed)
            throw new common_1.NotFoundException(`Bed ${dto.bedId} not found`);
        const resident = await this.residentRepo.findById(dto.residentId);
        if (!resident)
            throw new common_1.NotFoundException(`Resident ${dto.residentId} not found`);
        const startDate = dto.checkInDate ? new Date(dto.checkInDate) : null;
        const endDate = dto.contractEndDate
            ? new Date(dto.contractEndDate)
            : dto.checkOutDate
                ? new Date(dto.checkOutDate)
                : null;
        if (startDate && endDate && startDate >= endDate) {
            throw new common_1.BadRequestException('Licence start date must be before end date');
        }
        if (dto.checkInDate && dto.checkOutDate) {
            const checkInDate = new Date(dto.checkInDate);
            const checkOutDate = new Date(dto.checkOutDate);
            if (checkOutDate < checkInDate) {
                throw new common_1.BadRequestException('Check-out date cannot be before check-in date');
            }
        }
        let status = dto.status;
        if (startDate && status !== 'completed') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            status = startDate > today ? 'upcoming' : 'active';
        }
        if (dto.status === 'active') {
            const activeBookings = await this.repo.findAllActiveByResidentId(dto.residentId);
            const FAR_FUTURE = new Date(8640000000000000);
            const conflicting = activeBookings.find(b => {
                if (b.id === dto.id)
                    return false;
                const bStart = b.checkInDate ? new Date(b.checkInDate) : null;
                const bEnd = b.contractEndDate ? new Date(b.contractEndDate) : b.checkOutDate ? new Date(b.checkOutDate) : null;
                if (!startDate || !bStart)
                    return true;
                return startDate < (bEnd ?? FAR_FUTURE) && bStart < (endDate ?? FAR_FUTURE);
            });
            if (conflicting) {
                throw new common_1.BadRequestException(`Resident already has an overlapping active booking (booking ${conflicting.id}) — active bookings for the same resident must not overlap in dates`);
            }
        }
        if (startDate && endDate) {
            const overlapping = await this.repo.findOverlappingActive(dto.bedId, startDate, endDate, dto.id);
            if (overlapping.length > 0) {
                throw new common_1.BadRequestException(`Bed is already allocated during the selected period (conflicts with booking ${overlapping[0].id})`);
            }
        }
        let existing = null;
        if (dto.id) {
            existing = await this.repo.findById(dto.id);
            if (!existing)
                throw new common_1.NotFoundException(`Booking ${dto.id} not found`);
        }
        const newRentAmount = dto.rentAmount ?? bed.rentAmount;
        const newDepositAmount = dto.depositAmount ?? bed.depositAmount;
        const scope = dto.rentChangeScope ?? 'period';
        const rentChanged = !!existing && (newRentAmount !== existing.rentAmount || newDepositAmount !== existing.depositAmount);
        const bookingRentAmount = rentChanged && scope === 'payment' ? existing.rentAmount : newRentAmount;
        const bookingDepositAmount = rentChanged && scope === 'payment' ? existing.depositAmount : newDepositAmount;
        const booking = await this.repo.save({
            ...dto,
            status,
            rentAmount: bookingRentAmount,
            depositAmount: bookingDepositAmount,
            checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : null,
            contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
            checkOutDate: dto.checkOutDate ? new Date(dto.checkOutDate) : null,
        });
        if (status === 'active') {
            await this.bedRepo.save({ id: dto.bedId, status: 'allocated' });
        }
        if (rentChanged) {
            const paymentsForBooking = await this.rentPaymentRepo.findAll({ bookingId: booking.id });
            const unpaid = paymentsForBooking.filter(p => p.paymentStatus !== 'paid').sort((a, b) => a.month.localeCompare(b.month));
            if (scope === 'payment') {
                const next = unpaid[0];
                if (next)
                    await this.rentPaymentRepo.save({ id: next.id, rentAmount: newRentAmount });
            }
            else {
                for (const payment of unpaid) {
                    await this.rentPaymentRepo.save({ id: payment.id, rentAmount: newRentAmount });
                }
                if (scope === 'bed') {
                    await this.bedRepo.save({ id: bed.id, rentAmount: newRentAmount, depositAmount: newDepositAmount });
                    await this.rateHistoryRepo.save({
                        bedId: bed.id,
                        rentAmount: newRentAmount,
                        depositAmount: newDepositAmount,
                        effectiveFrom: new Date(),
                    });
                }
            }
        }
        await this.auditLog.record({
            actor,
            action: existing ? 'update' : 'create',
            entityType: 'Booking',
            entityId: booking.id,
            before: existing,
            after: booking,
        });
        return booking;
    }
};
exports.SaveBookingUseCase = SaveBookingUseCase;
exports.SaveBookingUseCase = SaveBookingUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(booking_repository_1.BOOKING_REPOSITORY)),
    __param(1, (0, common_1.Inject)(bed_repository_1.BED_REPOSITORY)),
    __param(2, (0, common_1.Inject)(resident_repository_1.RESIDENT_REPOSITORY)),
    __param(3, (0, common_1.Inject)(rent_payment_repository_1.RENT_PAYMENT_REPOSITORY)),
    __param(4, (0, common_1.Inject)(bed_rate_history_repository_1.BED_RATE_HISTORY_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, audit_log_service_1.AuditLogService])
], SaveBookingUseCase);
//# sourceMappingURL=save-booking.use-case.js.map