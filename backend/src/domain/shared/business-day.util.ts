// No public-holiday calendar exists anywhere in SAMS (confirmed — grepped the whole backend).
// This skips weekends only; excluding actual bank holidays is a known follow-up, not silently
// approximated as calendar days per UC-601's own instruction to flag rather than guess.

const DAY_MS = 86400000;

/** Adds `days` business days (Mon-Fri) to `start`, skipping Saturdays/Sundays. */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) added++;
  }
  return result;
}

/** Whole business days between `now` and `deadline` — negative once the deadline has passed,
 *  the signal the Finance queue's urgency indicator is built on. */
export function businessDaysRemaining(deadline: Date, now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const direction = end >= start ? 1 : -1;
  let count = 0;
  let cursor = new Date(start);
  while (cursor.getTime() !== end.getTime()) {
    cursor = new Date(cursor.getTime() + direction * DAY_MS);
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count += direction;
  }
  return count;
}
