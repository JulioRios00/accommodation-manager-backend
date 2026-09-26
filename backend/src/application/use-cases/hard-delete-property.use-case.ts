import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { PropertyOrmEntity } from '../../infrastructure/database/typeorm/entities/property.orm-entity';
import { BedOrmEntity } from '../../infrastructure/database/typeorm/entities/bed.orm-entity';
import { BedroomOrmEntity } from '../../infrastructure/database/typeorm/entities/bedroom.orm-entity';
import { BookingOrmEntity } from '../../infrastructure/database/typeorm/entities/booking.orm-entity';
import { ResidentOrmEntity } from '../../infrastructure/database/typeorm/entities/resident.orm-entity';

// Permanently removes a property and every record that exists only because of it.
// Separate from the regular (soft) delete — this is a SysAdmin-only "start over" tool
// for development/testing data, not an operational "handed back to landlord" event.
@Injectable()
export class HardDeletePropertyUseCase {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(propertyId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const property = await manager.findOne(PropertyOrmEntity, { where: { id: propertyId } });
      if (!property) throw new NotFoundException(`Property ${propertyId} not found`);

      const beds = await manager.find(BedOrmEntity, { where: { propertyId } });
      const bedIds = beds.map((b) => b.id);

      const bookings = bedIds.length
        ? await manager.find(BookingOrmEntity, { where: { bedId: In(bedIds) } })
        : [];
      const residentIds = [...new Set(bookings.map((b) => b.residentId))];

      await manager.query(
        `DELETE FROM ticket_activity_logs WHERE "ticketId" IN (SELECT id FROM maintenance_tickets WHERE "propertyId" = $1)`,
        [propertyId],
      );
      await manager.query(`DELETE FROM maintenance_tickets WHERE "propertyId" = $1`, [propertyId]);
      await manager.query(`DELETE FROM key_logs WHERE "propertyId" = $1`, [propertyId]);
      await manager.query(`DELETE FROM deposit_transactions WHERE "propertyId" = $1`, [propertyId]);
      await manager.query(
        `DELETE FROM rent_payment_installments WHERE "rentPaymentId" IN (SELECT id FROM rent_payments WHERE "propertyId" = $1)`,
        [propertyId],
      );
      await manager.query(`DELETE FROM rent_payments WHERE "propertyId" = $1`, [propertyId]);
      await manager.query(`DELETE FROM landlord_payments WHERE "propertyId" = $1`, [propertyId]);
      await manager.query(`DELETE FROM property_administrators WHERE "propertyId" = $1`, [propertyId]);
      await manager.query(`DELETE FROM property_spaces WHERE "propertyId" = $1`, [propertyId]);

      if (bedIds.length) {
        await manager.delete(BookingOrmEntity, { bedId: In(bedIds) });
      }
      await manager.delete(BedOrmEntity, { propertyId });
      await manager.delete(BedroomOrmEntity, { propertyId });

      // A resident who has no bookings left anywhere (i.e. only ever lived at this
      // property) is orphaned by the cascade above — remove them too. One who was
      // ever booked elsewhere keeps their record.
      for (const residentId of residentIds) {
        const remaining = await manager.count(BookingOrmEntity, { where: { residentId } });
        if (remaining === 0) {
          await manager.delete(ResidentOrmEntity, { id: residentId });
        }
      }

      await manager.delete(PropertyOrmEntity, { id: propertyId });
    });
  }
}
