import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MetricsMiddleware } from './presentation/middleware/metrics.middleware';
import { ClerkAuthGuard } from './presentation/guards/clerk-auth.guard';
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
    ImportController,
    DashboardController,
    PropertiesController,
    BedsController,
    ResidentsController,
    BookingsController,
    HealthController,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    ImportXlsxUseCase,
    GetDashboardStatsUseCase,
    GetPropertiesUseCase,
    GetBedsUseCase,
    GetResidentsUseCase,
    GetBookingsUseCase,
    SavePropertyUseCase,
    DeletePropertyUseCase,
    SaveBedUseCase,
    DeleteBedUseCase,
    SaveResidentUseCase,
    DeleteResidentUseCase,
    SaveBookingUseCase,
    DeleteBookingUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
