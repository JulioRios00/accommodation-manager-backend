import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PropertyOrmEntity } from './typeorm/entities/property.orm-entity';
import { BedOrmEntity } from './typeorm/entities/bed.orm-entity';
import { ResidentOrmEntity } from './typeorm/entities/resident.orm-entity';
import { BookingOrmEntity } from './typeorm/entities/booking.orm-entity';
import { PropertyTypeOrmRepository } from './typeorm/repositories/property.typeorm-repository';
import { BedTypeOrmRepository } from './typeorm/repositories/bed.typeorm-repository';
import { ResidentTypeOrmRepository } from './typeorm/repositories/resident.typeorm-repository';
import { BookingTypeOrmRepository } from './typeorm/repositories/booking.typeorm-repository';
import { PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('DB_PASSWORD', '');
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER', 'postgres'),
          // empty string = no password (Homebrew local trust auth)
          password: password || undefined,
          database: config.get<string>('DB_NAME', 'accommodation'),
          entities: [PropertyOrmEntity, BedOrmEntity, ResidentOrmEntity, BookingOrmEntity],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([
      PropertyOrmEntity,
      BedOrmEntity,
      ResidentOrmEntity,
      BookingOrmEntity,
    ]),
  ],
  providers: [
    { provide: PROPERTY_REPOSITORY, useClass: PropertyTypeOrmRepository },
    { provide: BED_REPOSITORY, useClass: BedTypeOrmRepository },
    { provide: RESIDENT_REPOSITORY, useClass: ResidentTypeOrmRepository },
    { provide: BOOKING_REPOSITORY, useClass: BookingTypeOrmRepository },
  ],
  exports: [PROPERTY_REPOSITORY, BED_REPOSITORY, RESIDENT_REPOSITORY, BOOKING_REPOSITORY],
})
export class DatabaseModule {}
