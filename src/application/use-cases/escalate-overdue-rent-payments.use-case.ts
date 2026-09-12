import { Inject, Injectable, Logger } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { deriveDueDate, daysOverdue } from '../../domain/rent-payment/rent-payment.util';
import { EmailTemplateKey } from '../../domain/email-template/email-template.entity';
import { renderTemplate } from '../../domain/email-template/email-template-renderer';
import { GetEmailTemplateUseCase } from './get-email-template.use-case';
import { EmailService } from '../services/email.service';

export interface EscalationResult {
  d1Sent: number;
  d4Sent: number;
  skippedNoEmail: number;
}

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: Date) => d.toLocaleDateString('en-IE');

@Injectable()
export class EscalateOverdueRentPaymentsUseCase {
  private readonly logger = new Logger(EscalateOverdueRentPaymentsUseCase.name);

  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    private readonly getTemplate: GetEmailTemplateUseCase,
    private readonly emailService: EmailService,
  ) {}

  // `now` is injectable for tests — production always uses the real clock.
  async execute(now: Date = new Date()): Promise<EscalationResult> {
    const payments = await this.paymentRepo.findAll();
    const pending = payments.filter((p) => p.paymentStatus !== 'paid');

    const result: EscalationResult = { d1Sent: 0, d4Sent: 0, skippedNoEmail: 0 };

    for (const payment of pending) {
      const dueDate = deriveDueDate(payment.month, payment.paymentDueDay);
      const overdue = daysOverdue(dueDate, now);

      // `>=` + null-check (not `===`) rather than an exact-day match: a missed cron run
      // self-heals by firing late instead of never firing, while the null-check keeps it
      // idempotent against re-runs on the same day.
      const needsD1 = overdue >= 1 && !payment.d1ReminderSentAt;
      const needsD4 = overdue >= 4 && !payment.d4NoticeSentAt;
      if (!needsD1 && !needsD4) continue;

      const resident = await this.residentRepo.findById(payment.residentId);
      if (!resident?.email) {
        this.logger.warn(`[escalation] RentPayment ${payment.id} is overdue but resident has no email — skipping`);
        result.skippedNoEmail++;
        continue;
      }

      const values = {
        residentName: resident.fullName,
        amountDue: fmtCurrency(payment.rentAmount - payment.amountPaid),
        dueDate: fmtDate(dueDate),
        daysOverdue: String(overdue),
      };

      if (needsD1) {
        await this.sendAndStamp(payment.id, resident.email, 'd1_reminder', values, now, 'd1ReminderSentAt', 'demand_d1');
        result.d1Sent++;
      }
      if (needsD4) {
        await this.sendAndStamp(payment.id, resident.email, 'd4_urgent', values, now, 'd4NoticeSentAt', 'final_demand_d4');
        result.d4Sent++;
      }
    }

    return result;
  }

  private async sendAndStamp(
    rentPaymentId: string,
    email: string,
    templateKey: EmailTemplateKey,
    values: Record<string, string>,
    now: Date,
    stampField: 'd1ReminderSentAt' | 'd4NoticeSentAt',
    lateStatus: string,
  ): Promise<void> {
    const template = await this.getTemplate.execute(templateKey);
    const subject = renderTemplate(template.subject, values);
    const body = renderTemplate(template.body, values);
    await this.emailService.send(email, subject, body);

    // Re-fetch immediately before stamping so a payment marked Received mid-run (between the
    // initial fetch and the email actually sending) doesn't get overwritten back to pending.
    const payment = await this.paymentRepo.findById(rentPaymentId);
    if (!payment || payment.paymentStatus === 'paid') return;
    await this.paymentRepo.save({ ...payment, [stampField]: now, lateStatus });
  }
}
