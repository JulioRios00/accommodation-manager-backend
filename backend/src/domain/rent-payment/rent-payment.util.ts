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
