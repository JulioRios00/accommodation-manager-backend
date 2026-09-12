import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EscalateOverdueRentPaymentsUseCase } from '../use-cases/escalate-overdue-rent-payments.use-case';

@Injectable()
export class RentPaymentEscalationCron {
  private readonly logger = new Logger(RentPaymentEscalationCron.name);

  constructor(private readonly escalateOverduePayments: EscalateOverdueRentPaymentsUseCase) {}

  @Cron('0 7 * * *')
  async handleDailyEscalation() {
    try {
      const result = await this.escalateOverduePayments.execute();
      this.logger.log(
        `Daily overdue escalation: ${result.d1Sent} D+1 reminder(s), ${result.d4Sent} D+4 notice(s) sent` +
        (result.skippedNoEmail ? `, ${result.skippedNoEmail} skipped (no resident email)` : ''),
      );
    } catch (err) {
      this.logger.error('Daily overdue escalation failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
