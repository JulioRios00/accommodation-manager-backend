import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GenerateUpcomingRentPaymentsUseCase } from '../use-cases/generate-upcoming-rent-payments.use-case';
import { GenerateUpcomingLandlordPaymentsUseCase } from '../use-cases/generate-upcoming-landlord-payments.use-case';

@Injectable()
export class PaymentGenerationCron {
  private readonly logger = new Logger(PaymentGenerationCron.name);

  constructor(
    private readonly generateRentPayments: GenerateUpcomingRentPaymentsUseCase,
    private readonly generateLandlordPayments: GenerateUpcomingLandlordPaymentsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyGeneration() {
    try {
      const rent = await this.generateRentPayments.execute();
      const landlord = await this.generateLandlordPayments.execute();
      this.logger.log(`Daily payment generation: ${rent.created} rent payment(s), ${landlord.created} landlord payment(s) created`);
    } catch (err) {
      this.logger.error('Daily payment generation failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
