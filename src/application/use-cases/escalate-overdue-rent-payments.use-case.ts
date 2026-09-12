import { Inject, Injectable, Logger } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { deriveDueDate, daysOverdue } from '../../domain/rent-payment/rent-payment.util';
import { EmailTemplateKey } from '../../domain/email-template/email-template.entity';
import { renderTemplate } from '../../domain/email-template/email-template-renderer';
import { GetEmailTemplateUseCase } from './get-email-template.use-case';
import { EmailService } from '../services/email.service';
import { Actor, AuditLogService } from '../services/audit-log.service';

export interface EscalationResult {
  d1Sent: number;
  d4Sent: number;
  d1Failed: number;
  d4Failed: number;
  skippedNoEmail: number;
}

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: Date) => d.toLocaleDateString('en-IE');

// The escalation job runs on a schedule, not on behalf of a signed-in user — this attributes
// its audit-log entries to a recognizable system actor rather than 'unknown'.
const SYSTEM_ACTOR: Actor = { userId: 'system', role: 'cron' };

@Injectable()
export class EscalateOverdueRentPaymentsUseCase {
  private readonly logger = new Logger(EscalateOverdueRentPaymentsUseCase.name);

  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    private readonly getTemplate: GetEmailTemplateUseCase,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  // `now` is injectable for tests — production always uses the real clock.
  async execute(now: Date = new Date()): Promise<EscalationResult> {
    const payments = await this.paymentRepo.findAll();
    const pending = payments.filter((p) => p.paymentStatus !== 'paid');

    const result: EscalationResult = { d1Sent: 0, d4Sent: 0, d1Failed: 0, d4Failed: 0, skippedNoEmail: 0 };

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

      // Each send is isolated — one resident's bad email address or a transient provider
      // error must not abort the run for everyone else still due a reminder today.
      if (needsD1) {
        const sent = await this.sendAndStamp(payment.id, resident.email, 'd1_reminder', values, now, 'd1ReminderSentAt', 'demand_d1');
        sent ? result.d1Sent++ : result.d1Failed++;
      }
      if (needsD4) {
        const sent = await this.sendAndStamp(payment.id, resident.email, 'd4_urgent', values, now, 'd4NoticeSentAt', 'final_demand_d4');
        sent ? result.d4Sent++ : result.d4Failed++;
      }
    }

    return result;
  }

  /** Returns whether the email actually sent — never throws, so one failure doesn't stop the
   *  rest of the run. Records an audit-log entry either way (RentPayment entityId, so it shows
   *  up in that charge's history in the Activity Log alongside its other changes). */
  private async sendAndStamp(
    rentPaymentId: string,
    email: string,
    templateKey: EmailTemplateKey,
    values: Record<string, string>,
    now: Date,
    stampField: 'd1ReminderSentAt' | 'd4NoticeSentAt',
    lateStatus: string,
  ): Promise<boolean> {
    const template = await this.getTemplate.execute(templateKey);
    const subject = renderTemplate(template.subject, values);
    const body = renderTemplate(template.body, values);

    try {
      await this.emailService.send(email, subject, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[escalation] failed to send ${templateKey} for RentPayment ${rentPaymentId}: ${message}`);
      await this.auditLog.record({
        actor: SYSTEM_ACTOR,
        action: 'email_fail',
        entityType: 'RentPayment',
        entityId: rentPaymentId,
        before: null,
        after: { template: templateKey, recipientEmail: email, subject, error: message },
      });
      return false;
    }

    await this.auditLog.record({
      actor: SYSTEM_ACTOR,
      action: 'email_sent',
      entityType: 'RentPayment',
      entityId: rentPaymentId,
      before: null,
      after: { template: templateKey, recipientEmail: email, subject },
    });

    // Re-fetch immediately before stamping so a payment marked Received mid-run (between the
    // initial fetch and the email actually sending) doesn't get overwritten back to pending.
    const payment = await this.paymentRepo.findById(rentPaymentId);
    if (!payment || payment.paymentStatus === 'paid') return true;
    await this.paymentRepo.save({ ...payment, [stampField]: now, lateStatus });
    return true;
  }
}
