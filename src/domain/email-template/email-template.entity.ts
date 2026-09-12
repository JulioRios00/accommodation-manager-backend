export type EmailTemplateKey = 'd1_reminder' | 'd4_urgent';

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = ['d1_reminder', 'd4_urgent'];

/** Variables the escalation job actually substitutes — the only ones a template may reference.
 *  Kept here (not just in the validator) so the frontend preview and backend validation can't
 *  drift apart. */
export const EMAIL_TEMPLATE_VARIABLES = ['residentName', 'amountDue', 'dueDate', 'daysOverdue'] as const;
export type EmailTemplateVariable = (typeof EMAIL_TEMPLATE_VARIABLES)[number];

export class EmailTemplate {
  key: EmailTemplateKey;
  subject: string;
  body: string;
  updatedAt: Date;
}

const DEFAULTS: Record<EmailTemplateKey, { subject: string; body: string }> = {
  d1_reminder: {
    subject: 'Rent payment reminder — {{amountDue}} overdue',
    body:
      '<p>Hi {{residentName}},</p>' +
      '<p>Our records show your rent payment of <strong>{{amountDue}}</strong> (due {{dueDate}}) has not yet been received — it is now {{daysOverdue}} day(s) overdue.</p>' +
      '<p>Please arrange payment as soon as possible. If you have already paid, please disregard this notice.</p>',
  },
  d4_urgent: {
    subject: 'URGENT — rent payment {{daysOverdue}} days overdue',
    body:
      '<p>Hi {{residentName}},</p>' +
      '<p>Your rent payment of <strong>{{amountDue}}</strong> (due {{dueDate}}) is now {{daysOverdue}} days overdue and requires immediate attention.</p>' +
      '<p>Please contact us urgently to resolve this outstanding balance.</p>',
  },
};

/** The template a key resolves to when no row has been saved for it yet — lets the feature
 *  work immediately without a manual seed step. */
export function defaultEmailTemplate(key: EmailTemplateKey): EmailTemplate {
  const t = new EmailTemplate();
  t.key = key;
  t.subject = DEFAULTS[key].subject;
  t.body = DEFAULTS[key].body;
  t.updatedAt = new Date(0);
  return t;
}
