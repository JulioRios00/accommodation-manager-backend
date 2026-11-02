import { Inject, Injectable } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { escalationStage } from '../../domain/rent-payment/rent-payment.util';
import { EmailTemplateKey } from '../../domain/email-template/email-template.entity';
import { renderTemplate } from '../../domain/email-template/email-template-renderer';
import { GetEmailTemplateUseCase } from './get-email-template.use-case';

/** Why an email is or isn't going out, in the terms someone reviewing the list cares about. */
export type OverdueEmailState =
  /** The escalation job would send this on its next run. */
  | 'due to send'
  /** Already gone out; shown so the list is the whole picture, not just what is pending. */
  | 'already sent'
  /** Overdue, but there is no address to send to — invisible in the job's own output. */
  | 'no email address';

export interface OverdueEmailPreview {
  state: OverdueEmailState;
  template: EmailTemplateKey;
  propertyCode: string;
  residentName: string;
  email: string | null;
  month: string;
  dueDate: Date;
  daysOverdue: number;
  rentAmount: number;
  amountPaid: number;
  amountDue: number;
  sentAt: Date | null;
  subject: string;
  body: string;
}

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: Date) => d.toLocaleDateString('en-IE');

/**
 * The overdue-rent emails, rendered exactly as the escalation job would render them, without
 * sending anything or touching a record.
 *
 * It exists so the escalation can be checked before it runs: these messages go to residents
 * about money, and until now the only way to see one was to let it send. Nothing here writes,
 * and in particular it does not stamp d1ReminderSentAt or d4NoticeSentAt — previewing must
 * never be able to stop a real reminder going out.
 */
@Injectable()
export class PreviewOverdueEmailsUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    private readonly getTemplate: GetEmailTemplateUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<OverdueEmailPreview[]> {
    const [payments, residents, properties, d1, d4] = await Promise.all([
      this.paymentRepo.findAll(),
      this.residentRepo.findAll(),
      this.propertyRepo.findAll(true),
      this.getTemplate.execute('d1_reminder'),
      this.getTemplate.execute('d4_urgent'),
    ]);
    const residentById = new Map(residents.map(r => [r.id, r]));
    const propertyCode = new Map(properties.map(p => [p.id, p.code]));
    const templates = { d1_reminder: d1, d4_urgent: d4 };

    const rows: OverdueEmailPreview[] = [];

    for (const payment of payments) {
      if (payment.paymentStatus === 'paid') continue;
      const { dueDate, overdue, needsD1, needsD4 } = escalationStage(payment, now);
      if (overdue < 1) continue;

      const resident = residentById.get(payment.residentId);
      // A resident the payment points at but the system no longer lists is a data problem,
      // not an email to review — and the job skips it too.
      if (!resident) continue;

      const amountDue = payment.rentAmount - payment.amountPaid;
      const values = {
        residentName: resident.fullName,
        amountDue: fmtCurrency(amountDue),
        dueDate: fmtDate(dueDate),
        daysOverdue: String(overdue),
      };

      const base = {
        propertyCode: propertyCode.get(payment.propertyId) ?? '—',
        residentName: resident.fullName,
        email: resident.email ?? null,
        month: payment.month,
        dueDate,
        daysOverdue: overdue,
        rentAmount: payment.rentAmount,
        amountPaid: payment.amountPaid,
        amountDue,
      };

      // Both stages can apply to one payment: a charge four days overdue that has had no
      // contact at all is due a reminder and a final notice, and the job sends both.
      const stages: { key: EmailTemplateKey; needed: boolean; sentAt: Date | null }[] = [
        { key: 'd1_reminder', needed: needsD1, sentAt: payment.d1ReminderSentAt },
        { key: 'd4_urgent', needed: needsD4, sentAt: payment.d4NoticeSentAt },
      ];

      for (const { key, needed, sentAt } of stages) {
        // Not yet reached this stage — nothing to show, in either direction.
        if (!needed && !sentAt) continue;
        const template = templates[key];
        rows.push({
          ...base,
          template: key,
          state: sentAt ? 'already sent' : resident.email ? 'due to send' : 'no email address',
          sentAt: sentAt ?? null,
          subject: renderTemplate(template.subject, values),
          body: renderTemplate(template.body, values),
        });
      }
    }

    // Most overdue first: the list is read top-down and that is the order it should be acted on.
    return rows.sort((a, b) => b.daysOverdue - a.daysOverdue || a.residentName.localeCompare(b.residentName));
  }
}
