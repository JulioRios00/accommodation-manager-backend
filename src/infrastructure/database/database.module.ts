import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PropertyOrmEntity } from './typeorm/entities/property.orm-entity';
import { BedOrmEntity } from './typeorm/entities/bed.orm-entity';
import { ResidentOrmEntity } from './typeorm/entities/resident.orm-entity';
import { BookingOrmEntity } from './typeorm/entities/booking.orm-entity';
import { LandlordOrmEntity } from './typeorm/entities/landlord.orm-entity';
import { PropertyAdministratorOrmEntity } from './typeorm/entities/property-administrator.orm-entity';
import { ServiceProviderOrmEntity } from './typeorm/entities/service-provider.orm-entity';
import { MaintenanceTicketOrmEntity } from './typeorm/entities/maintenance-ticket.orm-entity';
import { TicketActivityLogOrmEntity } from './typeorm/entities/ticket-activity-log.orm-entity';
import { KeyLogOrmEntity } from './typeorm/entities/key-log.orm-entity';
import { CheckoutRecordOrmEntity } from './typeorm/entities/checkout-record.orm-entity';
import { RentPaymentOrmEntity, RentPaymentInstallmentOrmEntity } from './typeorm/entities/rent-payment.orm-entity';
import { LandlordPaymentOrmEntity } from './typeorm/entities/landlord-payment.orm-entity';
import { DepositTransactionOrmEntity } from './typeorm/entities/deposit-transaction.orm-entity';
import { CompanyOrmEntity } from './typeorm/entities/company.orm-entity';
import { AuditLogOrmEntity } from './typeorm/entities/audit-log.orm-entity';

import { PropertyTypeOrmRepository } from './typeorm/repositories/property.typeorm-repository';
import { BedTypeOrmRepository } from './typeorm/repositories/bed.typeorm-repository';
import { ResidentTypeOrmRepository } from './typeorm/repositories/resident.typeorm-repository';
import { BookingTypeOrmRepository } from './typeorm/repositories/booking.typeorm-repository';
import { LandlordTypeOrmRepository } from './typeorm/repositories/landlord.typeorm-repository';
import { PropertyAdministratorTypeOrmRepository } from './typeorm/repositories/property-administrator.typeorm-repository';
import { ServiceProviderTypeOrmRepository } from './typeorm/repositories/service-provider.typeorm-repository';
import { MaintenanceTicketTypeOrmRepository } from './typeorm/repositories/maintenance-ticket.typeorm-repository';
import { TicketActivityLogTypeOrmRepository } from './typeorm/repositories/ticket-activity-log.typeorm-repository';
import { KeyLogTypeOrmRepository } from './typeorm/repositories/key-log.typeorm-repository';
import { CheckoutRecordTypeOrmRepository } from './typeorm/repositories/checkout-record.typeorm-repository';
import { RentPaymentTypeOrmRepository, RentPaymentInstallmentTypeOrmRepository } from './typeorm/repositories/rent-payment.typeorm-repository';
import { LandlordPaymentTypeOrmRepository } from './typeorm/repositories/landlord-payment.typeorm-repository';
import { DepositTransactionTypeOrmRepository } from './typeorm/repositories/deposit-transaction.typeorm-repository';
import { CompanyTypeOrmRepository } from './typeorm/repositories/company.typeorm-repository';
import { AuditLogTypeOrmRepository } from './typeorm/repositories/audit-log.typeorm-repository';

import { PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';
import { PROPERTY_ADMINISTRATOR_REPOSITORY } from '../../domain/property-administrator/property-administrator.repository';
import { SERVICE_PROVIDER_REPOSITORY } from '../../domain/service-provider/service-provider.repository';
import { MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';
import { TICKET_ACTIVITY_LOG_REPOSITORY } from '../../domain/ticket-activity-log/ticket-activity-log.repository';
import { KEY_LOG_REPOSITORY } from '../../domain/key-log/key-log.repository';
import { CHECKOUT_RECORD_REPOSITORY } from '../../domain/checkout-record/checkout-record.repository';
import { RENT_PAYMENT_REPOSITORY, RENT_PAYMENT_INSTALLMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { COMPANY_REPOSITORY } from '../../domain/company/company.repository';
import { AUDIT_LOG_REPOSITORY } from '../../domain/audit-log/audit-log.repository';

const ALL_ENTITIES = [
  PropertyOrmEntity, BedOrmEntity, ResidentOrmEntity, BookingOrmEntity,
  LandlordOrmEntity, PropertyAdministratorOrmEntity, ServiceProviderOrmEntity,
  MaintenanceTicketOrmEntity, TicketActivityLogOrmEntity, KeyLogOrmEntity,
  CheckoutRecordOrmEntity, RentPaymentOrmEntity, RentPaymentInstallmentOrmEntity,
  LandlordPaymentOrmEntity, DepositTransactionOrmEntity, CompanyOrmEntity, AuditLogOrmEntity,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return { type: 'postgres' as const, url: databaseUrl, entities: ALL_ENTITIES, synchronize: true, ssl: { rejectUnauthorized: false } };
        }
        const password = config.get<string>('DB_PASSWORD', '');
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER', 'postgres'),
          password: password || undefined,
          database: config.get<string>('DB_NAME', 'accommodation'),
          entities: ALL_ENTITIES,
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature(ALL_ENTITIES),
  ],
  providers: [
    { provide: PROPERTY_REPOSITORY, useClass: PropertyTypeOrmRepository },
    { provide: BED_REPOSITORY, useClass: BedTypeOrmRepository },
    { provide: RESIDENT_REPOSITORY, useClass: ResidentTypeOrmRepository },
    { provide: BOOKING_REPOSITORY, useClass: BookingTypeOrmRepository },
    { provide: LANDLORD_REPOSITORY, useClass: LandlordTypeOrmRepository },
    { provide: PROPERTY_ADMINISTRATOR_REPOSITORY, useClass: PropertyAdministratorTypeOrmRepository },
    { provide: SERVICE_PROVIDER_REPOSITORY, useClass: ServiceProviderTypeOrmRepository },
    { provide: MAINTENANCE_TICKET_REPOSITORY, useClass: MaintenanceTicketTypeOrmRepository },
    { provide: TICKET_ACTIVITY_LOG_REPOSITORY, useClass: TicketActivityLogTypeOrmRepository },
    { provide: KEY_LOG_REPOSITORY, useClass: KeyLogTypeOrmRepository },
    { provide: CHECKOUT_RECORD_REPOSITORY, useClass: CheckoutRecordTypeOrmRepository },
    { provide: RENT_PAYMENT_REPOSITORY, useClass: RentPaymentTypeOrmRepository },
    { provide: RENT_PAYMENT_INSTALLMENT_REPOSITORY, useClass: RentPaymentInstallmentTypeOrmRepository },
    { provide: LANDLORD_PAYMENT_REPOSITORY, useClass: LandlordPaymentTypeOrmRepository },
    { provide: DEPOSIT_TRANSACTION_REPOSITORY, useClass: DepositTransactionTypeOrmRepository },
    { provide: COMPANY_REPOSITORY, useClass: CompanyTypeOrmRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogTypeOrmRepository },
  ],
  exports: [
    PROPERTY_REPOSITORY, BED_REPOSITORY, RESIDENT_REPOSITORY, BOOKING_REPOSITORY,
    LANDLORD_REPOSITORY, PROPERTY_ADMINISTRATOR_REPOSITORY, SERVICE_PROVIDER_REPOSITORY,
    MAINTENANCE_TICKET_REPOSITORY, TICKET_ACTIVITY_LOG_REPOSITORY, KEY_LOG_REPOSITORY,
    CHECKOUT_RECORD_REPOSITORY, RENT_PAYMENT_REPOSITORY, RENT_PAYMENT_INSTALLMENT_REPOSITORY,
    LANDLORD_PAYMENT_REPOSITORY, DEPOSIT_TRANSACTION_REPOSITORY, COMPANY_REPOSITORY, AUDIT_LOG_REPOSITORY,
  ],
})
export class DatabaseModule {}
