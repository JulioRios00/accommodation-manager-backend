"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const metrics_middleware_1 = require("./presentation/middleware/metrics.middleware");
const clerk_auth_guard_1 = require("./presentation/guards/clerk-auth.guard");
const roles_guard_1 = require("./presentation/guards/roles.guard");
const feature_flag_guard_1 = require("./presentation/guards/feature-flag.guard");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const terminus_1 = require("@nestjs/terminus");
const nestjs_pino_1 = require("nestjs-pino");
const setup_1 = require("@sentry/nestjs/setup");
const query_failed_filter_1 = require("./presentation/filters/query-failed.filter");
const database_module_1 = require("./infrastructure/database/database.module");
const typeorm_1 = require("@nestjs/typeorm");
const property_orm_entity_1 = require("./infrastructure/database/typeorm/entities/property.orm-entity");
const bed_orm_entity_1 = require("./infrastructure/database/typeorm/entities/bed.orm-entity");
const resident_orm_entity_1 = require("./infrastructure/database/typeorm/entities/resident.orm-entity");
const booking_orm_entity_1 = require("./infrastructure/database/typeorm/entities/booking.orm-entity");
const maintenance_ticket_orm_entity_1 = require("./infrastructure/database/typeorm/entities/maintenance-ticket.orm-entity");
const landlord_orm_entity_1 = require("./infrastructure/database/typeorm/entities/landlord.orm-entity");
const import_controller_1 = require("./presentation/controllers/import.controller");
const dashboard_controller_1 = require("./presentation/controllers/dashboard.controller");
const properties_controller_1 = require("./presentation/controllers/properties.controller");
const beds_controller_1 = require("./presentation/controllers/beds.controller");
const residents_controller_1 = require("./presentation/controllers/residents.controller");
const bookings_controller_1 = require("./presentation/controllers/bookings.controller");
const health_controller_1 = require("./presentation/controllers/health.controller");
const landlords_controller_1 = require("./presentation/controllers/landlords.controller");
const service_providers_controller_1 = require("./presentation/controllers/service-providers.controller");
const maintenance_tickets_controller_1 = require("./presentation/controllers/maintenance-tickets.controller");
const portal_controller_1 = require("./presentation/controllers/portal.controller");
const submit_resident_ticket_use_case_1 = require("./application/use-cases/submit-resident-ticket.use-case");
const key_logs_controller_1 = require("./presentation/controllers/key-logs.controller");
const checkout_controller_1 = require("./presentation/controllers/checkout.controller");
const rent_payments_controller_1 = require("./presentation/controllers/rent-payments.controller");
const landlord_payments_controller_1 = require("./presentation/controllers/landlord-payments.controller");
const deposit_transactions_controller_1 = require("./presentation/controllers/deposit-transactions.controller");
const reports_controller_1 = require("./presentation/controllers/reports.controller");
const custom_reports_controller_1 = require("./presentation/controllers/custom-reports.controller");
const companies_controller_1 = require("./presentation/controllers/companies.controller");
const email_templates_controller_1 = require("./presentation/controllers/email-templates.controller");
const feature_flags_controller_1 = require("./presentation/controllers/feature-flags.controller");
const bedrooms_controller_1 = require("./presentation/controllers/bedrooms.controller");
const users_controller_1 = require("./presentation/controllers/users.controller");
const role_permissions_controller_1 = require("./presentation/controllers/role-permissions.controller");
const import_xlsx_use_case_1 = require("./application/use-cases/import-xlsx.use-case");
const import_bills_use_case_1 = require("./application/use-cases/import-bills.use-case");
const import_residents_to_clerk_use_case_1 = require("./application/use-cases/import-residents-to-clerk.use-case");
const import_maintenance_use_case_1 = require("./application/use-cases/import-maintenance.use-case");
const import_deposits_use_case_1 = require("./application/use-cases/import-deposits.use-case");
const import_landlord_payments_use_case_1 = require("./application/use-cases/import-landlord-payments.use-case");
const import_resident_payments_use_case_1 = require("./application/use-cases/import-resident-payments.use-case");
const get_dashboard_stats_use_case_1 = require("./application/use-cases/get-dashboard-stats.use-case");
const get_properties_use_case_1 = require("./application/use-cases/get-properties.use-case");
const get_beds_use_case_1 = require("./application/use-cases/get-beds.use-case");
const get_residents_use_case_1 = require("./application/use-cases/get-residents.use-case");
const get_bookings_use_case_1 = require("./application/use-cases/get-bookings.use-case");
const save_property_use_case_1 = require("./application/use-cases/save-property.use-case");
const delete_property_use_case_1 = require("./application/use-cases/delete-property.use-case");
const hard_delete_property_use_case_1 = require("./application/use-cases/hard-delete-property.use-case");
const save_bed_use_case_1 = require("./application/use-cases/save-bed.use-case");
const delete_bed_use_case_1 = require("./application/use-cases/delete-bed.use-case");
const save_resident_use_case_1 = require("./application/use-cases/save-resident.use-case");
const delete_resident_use_case_1 = require("./application/use-cases/delete-resident.use-case");
const save_booking_use_case_1 = require("./application/use-cases/save-booking.use-case");
const delete_booking_use_case_1 = require("./application/use-cases/delete-booking.use-case");
const get_landlords_use_case_1 = require("./application/use-cases/get-landlords.use-case");
const save_landlord_use_case_1 = require("./application/use-cases/save-landlord.use-case");
const delete_landlord_use_case_1 = require("./application/use-cases/delete-landlord.use-case");
const get_property_administrators_use_case_1 = require("./application/use-cases/get-property-administrators.use-case");
const save_property_administrator_use_case_1 = require("./application/use-cases/save-property-administrator.use-case");
const delete_property_administrator_use_case_1 = require("./application/use-cases/delete-property-administrator.use-case");
const get_service_providers_use_case_1 = require("./application/use-cases/get-service-providers.use-case");
const save_service_provider_use_case_1 = require("./application/use-cases/save-service-provider.use-case");
const delete_service_provider_use_case_1 = require("./application/use-cases/delete-service-provider.use-case");
const get_maintenance_tickets_use_case_1 = require("./application/use-cases/get-maintenance-tickets.use-case");
const save_maintenance_ticket_use_case_1 = require("./application/use-cases/save-maintenance-ticket.use-case");
const delete_maintenance_ticket_use_case_1 = require("./application/use-cases/delete-maintenance-ticket.use-case");
const add_ticket_activity_use_case_1 = require("./application/use-cases/add-ticket-activity.use-case");
const get_key_logs_use_case_1 = require("./application/use-cases/get-key-logs.use-case");
const save_key_log_use_case_1 = require("./application/use-cases/save-key-log.use-case");
const delete_key_log_use_case_1 = require("./application/use-cases/delete-key-log.use-case");
const checkout_use_case_1 = require("./application/use-cases/checkout.use-case");
const get_rent_payments_use_case_1 = require("./application/use-cases/get-rent-payments.use-case");
const save_rent_payment_use_case_1 = require("./application/use-cases/save-rent-payment.use-case");
const delete_rent_payment_use_case_1 = require("./application/use-cases/delete-rent-payment.use-case");
const add_rent_installment_use_case_1 = require("./application/use-cases/add-rent-installment.use-case");
const get_receivables_ledger_use_case_1 = require("./application/use-cases/get-receivables-ledger.use-case");
const feature_flag_service_1 = require("./application/services/feature-flag.service");
const mark_rent_payment_received_use_case_1 = require("./application/use-cases/mark-rent-payment-received.use-case");
const get_email_template_use_case_1 = require("./application/use-cases/get-email-template.use-case");
const save_email_template_use_case_1 = require("./application/use-cases/save-email-template.use-case");
const escalate_overdue_rent_payments_use_case_1 = require("./application/use-cases/escalate-overdue-rent-payments.use-case");
const email_service_1 = require("./application/services/email.service");
const rent_payment_escalation_cron_1 = require("./application/services/rent-payment-escalation.cron");
const get_landlord_payments_use_case_1 = require("./application/use-cases/get-landlord-payments.use-case");
const save_landlord_payment_use_case_1 = require("./application/use-cases/save-landlord-payment.use-case");
const delete_landlord_payment_use_case_1 = require("./application/use-cases/delete-landlord-payment.use-case");
const get_landlord_disbursement_ledger_use_case_1 = require("./application/use-cases/get-landlord-disbursement-ledger.use-case");
const update_landlord_payment_notes_use_case_1 = require("./application/use-cases/update-landlord-payment-notes.use-case");
const mark_landlord_payment_paid_use_case_1 = require("./application/use-cases/mark-landlord-payment-paid.use-case");
const export_landlord_disbursements_use_case_1 = require("./application/use-cases/export-landlord-disbursements.use-case");
const get_deposit_transactions_use_case_1 = require("./application/use-cases/get-deposit-transactions.use-case");
const save_deposit_transaction_use_case_1 = require("./application/use-cases/save-deposit-transaction.use-case");
const delete_deposit_transaction_use_case_1 = require("./application/use-cases/delete-deposit-transaction.use-case");
const get_deposit_refund_queue_use_case_1 = require("./application/use-cases/get-deposit-refund-queue.use-case");
const complete_deposit_refund_use_case_1 = require("./application/use-cases/complete-deposit-refund.use-case");
const get_my_notifications_use_case_1 = require("./application/use-cases/get-my-notifications.use-case");
const mark_notification_read_use_case_1 = require("./application/use-cases/mark-notification-read.use-case");
const notification_service_1 = require("./application/services/notification.service");
const get_delinquency_report_use_case_1 = require("./application/use-cases/get-delinquency-report.use-case");
const get_portfolio_snapshot_use_case_1 = require("./application/use-cases/get-portfolio-snapshot.use-case");
const report_registry_service_1 = require("./application/services/report-registry.service");
const report_query_service_1 = require("./application/services/report-query.service");
const xlsx_report_exporter_service_1 = require("./application/services/xlsx-report-exporter.service");
const pdf_report_exporter_service_1 = require("./application/services/pdf-report-exporter.service");
const get_report_entities_use_case_1 = require("./application/use-cases/get-report-entities.use-case");
const get_report_entity_fields_use_case_1 = require("./application/use-cases/get-report-entity-fields.use-case");
const preview_custom_report_use_case_1 = require("./application/use-cases/preview-custom-report.use-case");
const export_custom_report_use_case_1 = require("./application/use-cases/export-custom-report.use-case");
const get_companies_use_case_1 = require("./application/use-cases/get-companies.use-case");
const save_company_use_case_1 = require("./application/use-cases/save-company.use-case");
const delete_company_use_case_1 = require("./application/use-cases/delete-company.use-case");
const get_bedrooms_use_case_1 = require("./application/use-cases/get-bedrooms.use-case");
const save_bedroom_use_case_1 = require("./application/use-cases/save-bedroom.use-case");
const delete_bedroom_use_case_1 = require("./application/use-cases/delete-bedroom.use-case");
const claim_ticket_use_case_1 = require("./application/use-cases/claim-ticket.use-case");
const close_ticket_use_case_1 = require("./application/use-cases/close-ticket.use-case");
const get_property_spaces_use_case_1 = require("./application/use-cases/get-property-spaces.use-case");
const save_property_space_use_case_1 = require("./application/use-cases/save-property-space.use-case");
const delete_property_space_use_case_1 = require("./application/use-cases/delete-property-space.use-case");
const save_space_item_use_case_1 = require("./application/use-cases/save-space-item.use-case");
const delete_space_item_use_case_1 = require("./application/use-cases/delete-space-item.use-case");
const property_spaces_controller_1 = require("./presentation/controllers/property-spaces.controller");
const get_role_permissions_use_case_1 = require("./application/use-cases/get-role-permissions.use-case");
const get_audit_logs_use_case_1 = require("./application/use-cases/get-audit-logs.use-case");
const audit_log_service_1 = require("./application/services/audit-log.service");
const import_jobs_service_1 = require("./application/services/import-jobs.service");
const audit_logs_controller_1 = require("./presentation/controllers/audit-logs.controller");
const transition_expired_bookings_use_case_1 = require("./application/use-cases/transition-expired-bookings.use-case");
const sync_property_lease_status_use_case_1 = require("./application/use-cases/sync-property-lease-status.use-case");
const booking_status_cron_1 = require("./application/services/booking-status.cron");
const save_role_permissions_use_case_1 = require("./application/use-cases/save-role-permissions.use-case");
const generate_upcoming_rent_payments_use_case_1 = require("./application/use-cases/generate-upcoming-rent-payments.use-case");
const generate_upcoming_landlord_payments_use_case_1 = require("./application/use-cases/generate-upcoming-landlord-payments.use-case");
const payment_generation_cron_1 = require("./application/services/payment-generation.cron");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(metrics_middleware_1.MetricsMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            setup_1.SentryModule.forRoot(),
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
                    transport: process.env.NODE_ENV !== 'production'
                        ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
                        : undefined,
                    redact: [
                        'req.headers.authorization',
                        'req.headers.cookie',
                        'req.headers["x-clerk-auth-token"]',
                        'req.headers["x-clerk-auth-signature"]',
                        'req.headers["x-vercel-proxy-signature"]',
                    ],
                },
            }),
            database_module_1.DatabaseModule,
            typeorm_1.TypeOrmModule.forFeature([property_orm_entity_1.PropertyOrmEntity, bed_orm_entity_1.BedOrmEntity, resident_orm_entity_1.ResidentOrmEntity, booking_orm_entity_1.BookingOrmEntity, maintenance_ticket_orm_entity_1.MaintenanceTicketOrmEntity, landlord_orm_entity_1.LandlordOrmEntity]),
            terminus_1.TerminusModule,
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [
            import_controller_1.ImportController, dashboard_controller_1.DashboardController, properties_controller_1.PropertiesController, beds_controller_1.BedsController,
            residents_controller_1.ResidentsController, bookings_controller_1.BookingsController, health_controller_1.HealthController,
            landlords_controller_1.LandlordsController, service_providers_controller_1.ServiceProvidersController, maintenance_tickets_controller_1.MaintenanceTicketsController, portal_controller_1.PortalController,
            key_logs_controller_1.KeyLogsController, checkout_controller_1.CheckoutController, rent_payments_controller_1.RentPaymentsController, landlord_payments_controller_1.LandlordPaymentsController,
            deposit_transactions_controller_1.DepositTransactionsController, reports_controller_1.ReportsController, custom_reports_controller_1.CustomReportsController, email_templates_controller_1.EmailTemplatesController, feature_flags_controller_1.FeatureFlagsController, companies_controller_1.CompaniesController, bedrooms_controller_1.BedroomsController,
            property_spaces_controller_1.PropertySpacesController, users_controller_1.UsersController, role_permissions_controller_1.RolePermissionsController, audit_logs_controller_1.AuditLogsController,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: setup_1.SentryGlobalFilter },
            { provide: core_1.APP_FILTER, useClass: query_failed_filter_1.QueryFailedFilter },
            { provide: core_1.APP_GUARD, useClass: clerk_auth_guard_1.ClerkAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: feature_flag_guard_1.FeatureFlagGuard },
            import_jobs_service_1.ImportJobsService,
            import_xlsx_use_case_1.ImportXlsxUseCase, import_bills_use_case_1.ImportBillsUseCase, import_maintenance_use_case_1.ImportMaintenanceUseCase, import_deposits_use_case_1.ImportDepositsUseCase, import_landlord_payments_use_case_1.ImportLandlordPaymentsUseCase, import_resident_payments_use_case_1.ImportResidentPaymentsUseCase, import_residents_to_clerk_use_case_1.ImportResidentsToClerkUseCase,
            get_dashboard_stats_use_case_1.GetDashboardStatsUseCase,
            get_properties_use_case_1.GetPropertiesUseCase, get_beds_use_case_1.GetBedsUseCase, get_residents_use_case_1.GetResidentsUseCase, get_bookings_use_case_1.GetBookingsUseCase,
            save_property_use_case_1.SavePropertyUseCase, delete_property_use_case_1.DeletePropertyUseCase, hard_delete_property_use_case_1.HardDeletePropertyUseCase, save_bed_use_case_1.SaveBedUseCase, delete_bed_use_case_1.DeleteBedUseCase,
            save_resident_use_case_1.SaveResidentUseCase, delete_resident_use_case_1.DeleteResidentUseCase, save_booking_use_case_1.SaveBookingUseCase, delete_booking_use_case_1.DeleteBookingUseCase,
            get_landlords_use_case_1.GetLandlordsUseCase, save_landlord_use_case_1.SaveLandlordUseCase, delete_landlord_use_case_1.DeleteLandlordUseCase,
            get_property_administrators_use_case_1.GetPropertyAdministratorsUseCase, save_property_administrator_use_case_1.SavePropertyAdministratorUseCase, delete_property_administrator_use_case_1.DeletePropertyAdministratorUseCase,
            get_service_providers_use_case_1.GetServiceProvidersUseCase, save_service_provider_use_case_1.SaveServiceProviderUseCase, delete_service_provider_use_case_1.DeleteServiceProviderUseCase,
            get_maintenance_tickets_use_case_1.GetMaintenanceTicketsUseCase, save_maintenance_ticket_use_case_1.SaveMaintenanceTicketUseCase, delete_maintenance_ticket_use_case_1.DeleteMaintenanceTicketUseCase, add_ticket_activity_use_case_1.AddTicketActivityUseCase, claim_ticket_use_case_1.ClaimTicketUseCase, close_ticket_use_case_1.CloseTicketUseCase, submit_resident_ticket_use_case_1.SubmitResidentTicketUseCase,
            get_key_logs_use_case_1.GetKeyLogsUseCase, save_key_log_use_case_1.SaveKeyLogUseCase, delete_key_log_use_case_1.DeleteKeyLogUseCase,
            checkout_use_case_1.CheckoutUseCase,
            get_rent_payments_use_case_1.GetRentPaymentsUseCase, save_rent_payment_use_case_1.SaveRentPaymentUseCase, delete_rent_payment_use_case_1.DeleteRentPaymentUseCase, add_rent_installment_use_case_1.AddRentInstallmentUseCase,
            feature_flag_service_1.FeatureFlagService,
            get_receivables_ledger_use_case_1.GetReceivablesLedgerUseCase, mark_rent_payment_received_use_case_1.MarkRentPaymentReceivedUseCase,
            get_email_template_use_case_1.GetEmailTemplateUseCase, save_email_template_use_case_1.SaveEmailTemplateUseCase, escalate_overdue_rent_payments_use_case_1.EscalateOverdueRentPaymentsUseCase,
            email_service_1.EmailService, rent_payment_escalation_cron_1.RentPaymentEscalationCron,
            get_landlord_payments_use_case_1.GetLandlordPaymentsUseCase, save_landlord_payment_use_case_1.SaveLandlordPaymentUseCase, delete_landlord_payment_use_case_1.DeleteLandlordPaymentUseCase,
            get_landlord_disbursement_ledger_use_case_1.GetLandlordDisbursementLedgerUseCase, update_landlord_payment_notes_use_case_1.UpdateLandlordPaymentNotesUseCase,
            mark_landlord_payment_paid_use_case_1.MarkLandlordPaymentPaidUseCase, export_landlord_disbursements_use_case_1.ExportLandlordDisbursementsUseCase,
            get_deposit_transactions_use_case_1.GetDepositTransactionsUseCase, save_deposit_transaction_use_case_1.SaveDepositTransactionUseCase, delete_deposit_transaction_use_case_1.DeleteDepositTransactionUseCase,
            get_deposit_refund_queue_use_case_1.GetDepositRefundQueueUseCase, complete_deposit_refund_use_case_1.CompleteDepositRefundUseCase,
            get_my_notifications_use_case_1.GetMyNotificationsUseCase, mark_notification_read_use_case_1.MarkNotificationReadUseCase, notification_service_1.NotificationService,
            get_delinquency_report_use_case_1.GetDelinquencyReportUseCase, get_portfolio_snapshot_use_case_1.GetPortfolioSnapshotUseCase,
            report_registry_service_1.ReportRegistryService, report_query_service_1.ReportQueryService, xlsx_report_exporter_service_1.XlsxReportExporterService, pdf_report_exporter_service_1.PdfReportExporterService,
            get_report_entities_use_case_1.GetReportEntitiesUseCase, get_report_entity_fields_use_case_1.GetReportEntityFieldsUseCase, preview_custom_report_use_case_1.PreviewCustomReportUseCase, export_custom_report_use_case_1.ExportCustomReportUseCase,
            get_companies_use_case_1.GetCompaniesUseCase, save_company_use_case_1.SaveCompanyUseCase, delete_company_use_case_1.DeleteCompanyUseCase,
            get_bedrooms_use_case_1.GetBedroomsUseCase, save_bedroom_use_case_1.SaveBedroomUseCase, delete_bedroom_use_case_1.DeleteBedroomUseCase,
            get_property_spaces_use_case_1.GetPropertySpacesUseCase, save_property_space_use_case_1.SavePropertySpaceUseCase, delete_property_space_use_case_1.DeletePropertySpaceUseCase,
            save_space_item_use_case_1.SaveSpaceItemUseCase, delete_space_item_use_case_1.DeleteSpaceItemUseCase,
            get_role_permissions_use_case_1.GetRolePermissionsUseCase, save_role_permissions_use_case_1.SaveRolePermissionsUseCase,
            generate_upcoming_rent_payments_use_case_1.GenerateUpcomingRentPaymentsUseCase, generate_upcoming_landlord_payments_use_case_1.GenerateUpcomingLandlordPaymentsUseCase, payment_generation_cron_1.PaymentGenerationCron,
            get_audit_logs_use_case_1.GetAuditLogsUseCase, audit_log_service_1.AuditLogService,
            transition_expired_bookings_use_case_1.TransitionExpiredBookingsUseCase, sync_property_lease_status_use_case_1.SyncPropertyLeaseStatusUseCase, booking_status_cron_1.BookingStatusCron,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map