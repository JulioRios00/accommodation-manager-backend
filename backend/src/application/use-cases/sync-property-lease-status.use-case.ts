import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

@Injectable()
export class SyncPropertyLeaseStatusUseCase {
  private readonly logger = new Logger(SyncPropertyLeaseStatusUseCase.name);

  constructor(@Inject(PROPERTY_REPOSITORY) private readonly repo: IPropertyRepository) {}

  async execute(): Promise<{ updated: number }> {
    const now = new Date();
    const properties = await this.repo.findAll(true);

    let updated = 0;
    for (const property of properties) {
      // No lease dates on file — status stays whatever it was manually set to.
      if (!property.leaseStartDate && !property.leaseEndDate) continue;

      const shouldBeActive =
        (!property.leaseStartDate || now >= property.leaseStartDate) &&
        (!property.leaseEndDate || now <= property.leaseEndDate);

      if (property.active !== shouldBeActive) {
        await this.repo.save({ id: property.id, active: shouldBeActive });
        updated++;
      }
    }

    if (updated) this.logger.log(`[sync-property-lease-status] ${updated} propert${updated === 1 ? 'y' : 'ies'} updated from lease dates`);
    return { updated };
  }
}
