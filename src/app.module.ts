import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MetricsMiddleware } from './presentation/middleware/metrics.middleware';
import { ClerkAuthGuard } from './presentation/guards/clerk-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { DatabaseModule } from './infrastructure/database/database.module';

import { ImportController } from './presentation/controllers/import.controller';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { PropertiesController } from './presentation/controllers/properties.controller';
import { BedsController } from './presentation/controllers/beds.controller';
import { ResidentsController } from './presentation/controllers/residents.controller';
import { BookingsController } from './presentation/controllers/bookings.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { LandlordsController } from './presentation/controllers/landlords.controller';
import { ServiceProvidersController } from './presentation/controllers/service-providers.controller';
import { MaintenanceTicketsController } from './presentation/controllers/maintenance-tickets.controller';
import { KeyLogsController } from './presentation/controllers/key-logs.controller';
import { CheckoutController } from './presentation/controllers/checkout.controller';
import { RentPaymentsController } from './presentation/controllers/rent-payments.controller';
import { LandlordPaymentsController } from './presentation/controllers/landlord-payments.controller';
import { DepositTransactionsController } from './presentation/controllers/deposit-transactions.controller';
import { ReportsController } from './presentation/controllers/reports.controller';
import { CompaniesController } from './presentation/controllers/companies.controller';

import { ImportXlsxUseCase } from './application/use-cases/import-xlsx.use-case';
import { GetDashboardStatsUseCase } from './application/use-cases/get-dashboard-stats.use-case';
import { GetPropertiesUseCase } from './application/use-cases/get-properties.use-case';
import { GetBedsUseCase } from './application/use-cases/get-beds.use-case';
import { GetResidentsUseCase } from './application/use-cases/get-residents.use-case';
import { GetBookingsUseCase } from './application/use-cases/get-bookings.use-case';
import { SavePropertyUseCase } from './application/use-cases/save-property.use-case';
import { DeletePropertyUseCase } from './application/use-cases/delete-property.use-case';
import { SaveBedUseCase } from './application/use-cases/save-bed.use-case';
import { DeleteBedUseCase } from './application/use-cases/delete-bed.use-case';
import { SaveResidentUseCase } from './application/use-cases/save-resident.use-case';
import { DeleteResidentUseCase } from './application/use-cases/delete-resident.use-case';
import { SaveBookingUseCase } from './application/use-cases/save-booking.use-case';
import { DeleteBookingUseCase } from './application/use-cases/delete-booking.use-case';
import { GetLandlordsUseCase } from './application/use-cases/get-landlords.use-case';
import { SaveLandlordUseCase } from './application/use-cases/save-landlord.use-case';
import { DeleteLandlordUseCase } from './application/use-cases/delete-landlord.use-case';
import { GetPropertyAdministratorsUseCase } from './application/use-cases/get-property-administrators.use-case';
import { SavePropertyAdministratorUseCase } from './application/use-cases/save-property-administrator.use-case';
import { DeletePropertyAdministratorUseCase } from './application/use-cases/delete-property-administrator.use-case';
import { GetServiceProvidersUseCase } from './application/use-cases/get-service-providers.use-case';
import { SaveServiceProviderUseCase } from './application/use-cases/save-service-provider.use-case';
import { DeleteServiceProviderUseCase } from './application/use-cases/delete-service-provider.use-case';
import { GetMaintenanceTicketsUseCase } from './application/use-cases/get-maintenance-tickets.use-case';
import { SaveMaintenanceTicketUseCase } from './application/use-cases/save-maintenance-ticket.use-case';
import { DeleteMaintenanceTicketUseCase } from './application/use-cases/delete-maintenance-ticket.use-case';
import { AddTicketActivityUseCase } from './application/use-cases/add-ticket-activity.use-case';
import { GetKeyLogsUseCase } from './application/use-cases/get-key-logs.use-case';
import { SaveKeyLogUseCase } from './application/use-cases/save-key-log.use-case';
import { DeleteKeyLogUseCase } from './application/use-cases/delete-key-log.use-case';
import { CheckoutUseCase } from './application/use-cases/checkout.use-case';
import { GetRentPaymentsUseCase } from './application/use-cases/get-rent-payments.use-case';
import { SaveRentPaymentUseCase } from './application/use-cases/save-rent-payment.use-case';
import { DeleteRentPaymentUseCase } from './application/use-cases/delete-rent-payment.use-case';
import { AddRentInstallmentUseCase } from './application/use-cases/add-rent-installment.use-case';
import { GetLandlordPaymentsUseCase } from './application/use-cases/get-landlord-payments.use-case';
import { SaveLandlordPaymentUseCase } from './application/use-cases/save-landlord-payment.use-case';
import { DeleteLandlordPaymentUseCase } from './application/use-cases/delete-landlord-payment.use-case';
import { GetDepositTransactionsUseCase } from './application/use-cases/get-deposit-transactions.use-case';
import { SaveDepositTransactionUseCase } from './application/use-cases/save-deposit-transaction.use-case';
import { DeleteDepositTransactionUseCase } from './application/use-cases/delete-deposit-transaction.use-case';
import { GetDelinquencyReportUseCase } from './application/use-cases/get-delinquency-report.use-case';
import { GetCompaniesUseCase } from './application/use-cases/get-companies.use-case';
import { SaveCompanyUseCase } from './application/use-cases/save-company.use-case';
import { DeleteCompanyUseCase } from './application/use-cases/delete-company.use-case';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    DatabaseModule,
    TerminusModule,
  ],
  controllers: [
    ImportController, DashboardController, PropertiesController, BedsController,
    ResidentsController, BookingsController, HealthController,
    LandlordsController, ServiceProvidersController, MaintenanceTicketsController,
    KeyLogsController, CheckoutController, RentPaymentsController, LandlordPaymentsController,
    DepositTransactionsController, ReportsController, CompaniesController,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    ImportXlsxUseCase, GetDashboardStatsUseCase,
    GetPropertiesUseCase, GetBedsUseCase, GetResidentsUseCase, GetBookingsUseCase,
    SavePropertyUseCase, DeletePropertyUseCase, SaveBedUseCase, DeleteBedUseCase,
    SaveResidentUseCase, DeleteResidentUseCase, SaveBookingUseCase, DeleteBookingUseCase,
    GetLandlordsUseCase, SaveLandlordUseCase, DeleteLandlordUseCase,
    GetPropertyAdministratorsUseCase, SavePropertyAdministratorUseCase, DeletePropertyAdministratorUseCase,
    GetServiceProvidersUseCase, SaveServiceProviderUseCase, DeleteServiceProviderUseCase,
    GetMaintenanceTicketsUseCase, SaveMaintenanceTicketUseCase, DeleteMaintenanceTicketUseCase, AddTicketActivityUseCase,
    GetKeyLogsUseCase, SaveKeyLogUseCase, DeleteKeyLogUseCase,
    CheckoutUseCase,
    GetRentPaymentsUseCase, SaveRentPaymentUseCase, DeleteRentPaymentUseCase, AddRentInstallmentUseCase,
    GetLandlordPaymentsUseCase, SaveLandlordPaymentUseCase, DeleteLandlordPaymentUseCase,
    GetDepositTransactionsUseCase, SaveDepositTransactionUseCase, DeleteDepositTransactionUseCase,
    GetDelinquencyReportUseCase,
    GetCompaniesUseCase, SaveCompanyUseCase, DeleteCompanyUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
