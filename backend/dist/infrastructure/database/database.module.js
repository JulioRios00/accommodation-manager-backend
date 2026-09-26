"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const property_orm_entity_1 = require("./typeorm/entities/property.orm-entity");
const bed_orm_entity_1 = require("./typeorm/entities/bed.orm-entity");
const bedroom_orm_entity_1 = require("./typeorm/entities/bedroom.orm-entity");
const resident_orm_entity_1 = require("./typeorm/entities/resident.orm-entity");
const booking_orm_entity_1 = require("./typeorm/entities/booking.orm-entity");
const landlord_orm_entity_1 = require("./typeorm/entities/landlord.orm-entity");
const property_administrator_orm_entity_1 = require("./typeorm/entities/property-administrator.orm-entity");
const service_provider_orm_entity_1 = require("./typeorm/entities/service-provider.orm-entity");
const maintenance_ticket_orm_entity_1 = require("./typeorm/entities/maintenance-ticket.orm-entity");
const ticket_activity_log_orm_entity_1 = require("./typeorm/entities/ticket-activity-log.orm-entity");
const key_log_orm_entity_1 = require("./typeorm/entities/key-log.orm-entity");
const checkout_record_orm_entity_1 = require("./typeorm/entities/checkout-record.orm-entity");
const rent_payment_orm_entity_1 = require("./typeorm/entities/rent-payment.orm-entity");
const landlord_payment_orm_entity_1 = require("./typeorm/entities/landlord-payment.orm-entity");
const deposit_transaction_orm_entity_1 = require("./typeorm/entities/deposit-transaction.orm-entity");
const company_orm_entity_1 = require("./typeorm/entities/company.orm-entity");
const audit_log_orm_entity_1 = require("./typeorm/entities/audit-log.orm-entity");
const property_space_orm_entity_1 = require("./typeorm/entities/property-space.orm-entity");
const space_item_orm_entity_1 = require("./typeorm/entities/space-item.orm-entity");
const role_permission_orm_entity_1 = require("./typeorm/entities/role-permission.orm-entity");
const bed_rate_history_orm_entity_1 = require("./typeorm/entities/bed-rate-history.orm-entity");
const email_template_orm_entity_1 = require("./typeorm/entities/email-template.orm-entity");
const notification_orm_entity_1 = require("./typeorm/entities/notification.orm-entity");
const feature_flag_orm_entity_1 = require("./typeorm/entities/feature-flag.orm-entity");
const saved_report_orm_entity_1 = require("./typeorm/entities/saved-report.orm-entity");
const property_typeorm_repository_1 = require("./typeorm/repositories/property.typeorm-repository");
const bed_typeorm_repository_1 = require("./typeorm/repositories/bed.typeorm-repository");
const bedroom_typeorm_repository_1 = require("./typeorm/repositories/bedroom.typeorm-repository");
const resident_typeorm_repository_1 = require("./typeorm/repositories/resident.typeorm-repository");
const booking_typeorm_repository_1 = require("./typeorm/repositories/booking.typeorm-repository");
const landlord_typeorm_repository_1 = require("./typeorm/repositories/landlord.typeorm-repository");
const property_administrator_typeorm_repository_1 = require("./typeorm/repositories/property-administrator.typeorm-repository");
const service_provider_typeorm_repository_1 = require("./typeorm/repositories/service-provider.typeorm-repository");
const maintenance_ticket_typeorm_repository_1 = require("./typeorm/repositories/maintenance-ticket.typeorm-repository");
const ticket_activity_log_typeorm_repository_1 = require("./typeorm/repositories/ticket-activity-log.typeorm-repository");
const key_log_typeorm_repository_1 = require("./typeorm/repositories/key-log.typeorm-repository");
const checkout_record_typeorm_repository_1 = require("./typeorm/repositories/checkout-record.typeorm-repository");
const rent_payment_typeorm_repository_1 = require("./typeorm/repositories/rent-payment.typeorm-repository");
const landlord_payment_typeorm_repository_1 = require("./typeorm/repositories/landlord-payment.typeorm-repository");
const deposit_transaction_typeorm_repository_1 = require("./typeorm/repositories/deposit-transaction.typeorm-repository");
const company_typeorm_repository_1 = require("./typeorm/repositories/company.typeorm-repository");
const audit_log_typeorm_repository_1 = require("./typeorm/repositories/audit-log.typeorm-repository");
const property_space_typeorm_repository_1 = require("./typeorm/repositories/property-space.typeorm-repository");
const role_permission_typeorm_repository_1 = require("./typeorm/repositories/role-permission.typeorm-repository");
const bed_rate_history_typeorm_repository_1 = require("./typeorm/repositories/bed-rate-history.typeorm-repository");
const email_template_typeorm_repository_1 = require("./typeorm/repositories/email-template.typeorm-repository");
const notification_typeorm_repository_1 = require("./typeorm/repositories/notification.typeorm-repository");
const feature_flag_typeorm_repository_1 = require("./typeorm/repositories/feature-flag.typeorm-repository");
const saved_report_typeorm_repository_1 = require("./typeorm/repositories/saved-report.typeorm-repository");
const property_repository_1 = require("../../domain/property/property.repository");
const bed_repository_1 = require("../../domain/bed/bed.repository");
const bedroom_repository_1 = require("../../domain/bedroom/bedroom.repository");
const resident_repository_1 = require("../../domain/resident/resident.repository");
const booking_repository_1 = require("../../domain/booking/booking.repository");
const landlord_repository_1 = require("../../domain/landlord/landlord.repository");
const property_administrator_repository_1 = require("../../domain/property-administrator/property-administrator.repository");
const service_provider_repository_1 = require("../../domain/service-provider/service-provider.repository");
const maintenance_ticket_repository_1 = require("../../domain/maintenance-ticket/maintenance-ticket.repository");
const ticket_activity_log_repository_1 = require("../../domain/ticket-activity-log/ticket-activity-log.repository");
const key_log_repository_1 = require("../../domain/key-log/key-log.repository");
const checkout_record_repository_1 = require("../../domain/checkout-record/checkout-record.repository");
const rent_payment_repository_1 = require("../../domain/rent-payment/rent-payment.repository");
const landlord_payment_repository_1 = require("../../domain/landlord-payment/landlord-payment.repository");
const deposit_transaction_repository_1 = require("../../domain/deposit-transaction/deposit-transaction.repository");
const company_repository_1 = require("../../domain/company/company.repository");
const audit_log_repository_1 = require("../../domain/audit-log/audit-log.repository");
const property_space_repository_1 = require("../../domain/property-space/property-space.repository");
const role_permission_repository_1 = require("../../domain/role-permission/role-permission.repository");
const bed_rate_history_repository_1 = require("../../domain/bed-rate-history/bed-rate-history.repository");
const email_template_repository_1 = require("../../domain/email-template/email-template.repository");
const notification_repository_1 = require("../../domain/notification/notification.repository");
const feature_flag_repository_1 = require("../../domain/feature-flag/feature-flag.repository");
const saved_report_repository_1 = require("../../domain/saved-report/saved-report.repository");
const ALL_ENTITIES = [
    property_orm_entity_1.PropertyOrmEntity, bed_orm_entity_1.BedOrmEntity, bedroom_orm_entity_1.BedroomOrmEntity, resident_orm_entity_1.ResidentOrmEntity, booking_orm_entity_1.BookingOrmEntity,
    landlord_orm_entity_1.LandlordOrmEntity, property_administrator_orm_entity_1.PropertyAdministratorOrmEntity, service_provider_orm_entity_1.ServiceProviderOrmEntity,
    maintenance_ticket_orm_entity_1.MaintenanceTicketOrmEntity, ticket_activity_log_orm_entity_1.TicketActivityLogOrmEntity, key_log_orm_entity_1.KeyLogOrmEntity,
    checkout_record_orm_entity_1.CheckoutRecordOrmEntity, rent_payment_orm_entity_1.RentPaymentOrmEntity, rent_payment_orm_entity_1.RentPaymentInstallmentOrmEntity,
    landlord_payment_orm_entity_1.LandlordPaymentOrmEntity, deposit_transaction_orm_entity_1.DepositTransactionOrmEntity, company_orm_entity_1.CompanyOrmEntity, audit_log_orm_entity_1.AuditLogOrmEntity,
    property_space_orm_entity_1.PropertySpaceOrmEntity, space_item_orm_entity_1.SpaceItemOrmEntity, role_permission_orm_entity_1.RolePermissionOrmEntity, bed_rate_history_orm_entity_1.BedRateHistoryOrmEntity,
    email_template_orm_entity_1.EmailTemplateOrmEntity, feature_flag_orm_entity_1.FeatureFlagOrmEntity, notification_orm_entity_1.NotificationOrmEntity, saved_report_orm_entity_1.SavedReportOrmEntity,
];
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const databaseUrl = config.get('DATABASE_URL');
                    if (databaseUrl) {
                        return { type: 'postgres', url: databaseUrl, entities: ALL_ENTITIES, synchronize: true, ssl: { rejectUnauthorized: false } };
                    }
                    const password = config.get('DB_PASSWORD', '');
                    return {
                        type: 'postgres',
                        host: config.get('DB_HOST', 'localhost'),
                        port: config.get('DB_PORT', 5432),
                        username: config.get('DB_USER', 'postgres'),
                        password: password || undefined,
                        database: config.get('DB_NAME', 'accommodation'),
                        entities: ALL_ENTITIES,
                        synchronize: true,
                    };
                },
            }),
            typeorm_1.TypeOrmModule.forFeature(ALL_ENTITIES),
        ],
        providers: [
            { provide: property_repository_1.PROPERTY_REPOSITORY, useClass: property_typeorm_repository_1.PropertyTypeOrmRepository },
            { provide: bed_repository_1.BED_REPOSITORY, useClass: bed_typeorm_repository_1.BedTypeOrmRepository },
            { provide: bedroom_repository_1.BEDROOM_REPOSITORY, useClass: bedroom_typeorm_repository_1.BedroomTypeOrmRepository },
            { provide: resident_repository_1.RESIDENT_REPOSITORY, useClass: resident_typeorm_repository_1.ResidentTypeOrmRepository },
            { provide: booking_repository_1.BOOKING_REPOSITORY, useClass: booking_typeorm_repository_1.BookingTypeOrmRepository },
            { provide: landlord_repository_1.LANDLORD_REPOSITORY, useClass: landlord_typeorm_repository_1.LandlordTypeOrmRepository },
            { provide: property_administrator_repository_1.PROPERTY_ADMINISTRATOR_REPOSITORY, useClass: property_administrator_typeorm_repository_1.PropertyAdministratorTypeOrmRepository },
            { provide: service_provider_repository_1.SERVICE_PROVIDER_REPOSITORY, useClass: service_provider_typeorm_repository_1.ServiceProviderTypeOrmRepository },
            { provide: maintenance_ticket_repository_1.MAINTENANCE_TICKET_REPOSITORY, useClass: maintenance_ticket_typeorm_repository_1.MaintenanceTicketTypeOrmRepository },
            { provide: ticket_activity_log_repository_1.TICKET_ACTIVITY_LOG_REPOSITORY, useClass: ticket_activity_log_typeorm_repository_1.TicketActivityLogTypeOrmRepository },
            { provide: key_log_repository_1.KEY_LOG_REPOSITORY, useClass: key_log_typeorm_repository_1.KeyLogTypeOrmRepository },
            { provide: checkout_record_repository_1.CHECKOUT_RECORD_REPOSITORY, useClass: checkout_record_typeorm_repository_1.CheckoutRecordTypeOrmRepository },
            { provide: rent_payment_repository_1.RENT_PAYMENT_REPOSITORY, useClass: rent_payment_typeorm_repository_1.RentPaymentTypeOrmRepository },
            { provide: rent_payment_repository_1.RENT_PAYMENT_INSTALLMENT_REPOSITORY, useClass: rent_payment_typeorm_repository_1.RentPaymentInstallmentTypeOrmRepository },
            { provide: landlord_payment_repository_1.LANDLORD_PAYMENT_REPOSITORY, useClass: landlord_payment_typeorm_repository_1.LandlordPaymentTypeOrmRepository },
            { provide: deposit_transaction_repository_1.DEPOSIT_TRANSACTION_REPOSITORY, useClass: deposit_transaction_typeorm_repository_1.DepositTransactionTypeOrmRepository },
            { provide: company_repository_1.COMPANY_REPOSITORY, useClass: company_typeorm_repository_1.CompanyTypeOrmRepository },
            { provide: audit_log_repository_1.AUDIT_LOG_REPOSITORY, useClass: audit_log_typeorm_repository_1.AuditLogTypeOrmRepository },
            { provide: property_space_repository_1.PROPERTY_SPACE_REPOSITORY, useClass: property_space_typeorm_repository_1.PropertySpaceTypeOrmRepository },
            { provide: property_space_repository_1.SPACE_ITEM_REPOSITORY, useClass: property_space_typeorm_repository_1.SpaceItemTypeOrmRepository },
            { provide: role_permission_repository_1.ROLE_PERMISSION_REPOSITORY, useClass: role_permission_typeorm_repository_1.RolePermissionTypeOrmRepository },
            { provide: bed_rate_history_repository_1.BED_RATE_HISTORY_REPOSITORY, useClass: bed_rate_history_typeorm_repository_1.BedRateHistoryTypeOrmRepository },
            { provide: email_template_repository_1.EMAIL_TEMPLATE_REPOSITORY, useClass: email_template_typeorm_repository_1.EmailTemplateTypeOrmRepository },
            { provide: notification_repository_1.NOTIFICATION_REPOSITORY, useClass: notification_typeorm_repository_1.NotificationTypeOrmRepository },
            { provide: feature_flag_repository_1.FEATURE_FLAG_REPOSITORY, useClass: feature_flag_typeorm_repository_1.FeatureFlagTypeOrmRepository },
            { provide: saved_report_repository_1.SAVED_REPORT_REPOSITORY, useClass: saved_report_typeorm_repository_1.SavedReportTypeOrmRepository },
        ],
        exports: [
            property_repository_1.PROPERTY_REPOSITORY, bed_repository_1.BED_REPOSITORY, bedroom_repository_1.BEDROOM_REPOSITORY, resident_repository_1.RESIDENT_REPOSITORY, booking_repository_1.BOOKING_REPOSITORY,
            landlord_repository_1.LANDLORD_REPOSITORY, property_administrator_repository_1.PROPERTY_ADMINISTRATOR_REPOSITORY, service_provider_repository_1.SERVICE_PROVIDER_REPOSITORY,
            maintenance_ticket_repository_1.MAINTENANCE_TICKET_REPOSITORY, ticket_activity_log_repository_1.TICKET_ACTIVITY_LOG_REPOSITORY, key_log_repository_1.KEY_LOG_REPOSITORY,
            checkout_record_repository_1.CHECKOUT_RECORD_REPOSITORY, rent_payment_repository_1.RENT_PAYMENT_REPOSITORY, rent_payment_repository_1.RENT_PAYMENT_INSTALLMENT_REPOSITORY,
            landlord_payment_repository_1.LANDLORD_PAYMENT_REPOSITORY, deposit_transaction_repository_1.DEPOSIT_TRANSACTION_REPOSITORY, company_repository_1.COMPANY_REPOSITORY, audit_log_repository_1.AUDIT_LOG_REPOSITORY,
            property_space_repository_1.PROPERTY_SPACE_REPOSITORY, property_space_repository_1.SPACE_ITEM_REPOSITORY, role_permission_repository_1.ROLE_PERMISSION_REPOSITORY, bed_rate_history_repository_1.BED_RATE_HISTORY_REPOSITORY,
            email_template_repository_1.EMAIL_TEMPLATE_REPOSITORY, feature_flag_repository_1.FEATURE_FLAG_REPOSITORY, notification_repository_1.NOTIFICATION_REPOSITORY, saved_report_repository_1.SAVED_REPORT_REPOSITORY,
        ],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map