import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransitionExpiredBookingsUseCase } from '../use-cases/transition-expired-bookings.use-case';
import { SyncPropertyLeaseStatusUseCase } from '../use-cases/sync-property-lease-status.use-case';

@Injectable()
export class BookingStatusCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(BookingStatusCron.name);

  constructor(
    private readonly transitionExpiredBookings: TransitionExpiredBookingsUseCase,
    private readonly syncPropertyLeaseStatus: SyncPropertyLeaseStatusUseCase,
  ) {}

  // Catches anything that expired while the server was down, without waiting for the next tick.
  async onApplicationBootstrap() {
    await this.run();
  }

  // Runs every 30 minutes so the noon cutover reflects promptly rather than once a day.
  @Cron('*/30 * * * *')
  async handleTransition() {
    await this.run();
  }

  private async run() {
    try {
      const result = await this.transitionExpiredBookings.execute();
      if (result.transitioned) {
        this.logger.log(`Booking status sweep: ${result.transitioned} booking(s) transitioned to completed`);
      }
    } catch (err) {
      this.logger.error('Booking status transition sweep failed', err instanceof Error ? err.stack : String(err));
    }

    try {
      await this.syncPropertyLeaseStatus.execute();
    } catch (err) {
      this.logger.error('Property lease status sync failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
