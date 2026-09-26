/** Bank transfer reference for a landlord disbursement — `RENT-SAMS-<year>-PROP<code>`, per the
 *  format confirmed for UC-502. `month` is 'YYYY-MM'; year comes from the rent period, not
 *  today's date, so the description stays correct if a payment is generated/exported late. */
export function paymentDescription(month: string, propertyCode: string): string {
  const year = month.split('-')[0] || String(new Date().getFullYear());
  return `RENT-SAMS-${year}-PROP${propertyCode}`;
}
