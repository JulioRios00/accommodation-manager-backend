const DAY_MS = 86400000;

/** RentPayment has no `dueDate` column — only `month` ('YYYY-MM') + `paymentDueDay`. Derives
 *  the actual due date from those two. Falls back to the 1st of the month when paymentDueDay
 *  is unset, rather than throwing — a payment record should always be reportable. */
export function deriveDueDate(month: string, paymentDueDay: number | null): Date {
  const [year, monthNum] = month.split('-').map(Number);
  const day = paymentDueDay && paymentDueDay > 0 ? paymentDueDay : 1;
  return new Date(year, monthNum - 1, day);
}

/** Whole days between the due date and `now` (defaults to today), clamped to >= 0 — a payment
 *  that isn't overdue yet reports 0, never a negative "days overdue". */
export function daysOverdue(dueDate: Date, now: Date = new Date()): number {
  const diff = Math.floor((startOfDay(now).getTime() - startOfDay(dueDate).getTime()) / DAY_MS);
  return Math.max(0, diff);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** What the escalation job would do with a payment on a given day.
 *
 *  This lives here, rather than inline in the job, because the preview report has to reach
 *  the same verdict the job will. Two copies of these conditions would drift, and a preview
 *  that disagrees with what actually sends is worse than none. */
export interface EscalationStage {
  /** Days past the due date, 0 when not yet due. */
  overdue: number;
  dueDate: Date;
  /** The reminder is due and has not gone out. */
  needsD1: boolean;
  /** The final notice is due and has not gone out. */
  needsD4: boolean;
}

export function escalationStage(
  payment: { month: string; paymentDueDay: number | null; d1ReminderSentAt: Date | null; d4NoticeSentAt: Date | null },
  now: Date = new Date(),
): EscalationStage {
  const dueDate = deriveDueDate(payment.month, payment.paymentDueDay);
  const overdue = daysOverdue(dueDate, now);
  return {
    dueDate,
    overdue,
    // `>=` plus a null-check, not an exact-day match: a missed run self-heals by firing late
    // instead of never firing, while the stamp keeps it idempotent against re-runs.
    needsD1: overdue >= 1 && !payment.d1ReminderSentAt,
    needsD4: overdue >= 4 && !payment.d4NoticeSentAt,
  };
}
