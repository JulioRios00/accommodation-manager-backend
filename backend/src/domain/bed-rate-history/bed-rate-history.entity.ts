// Append-only log of a Bed's rent/deposit over time. To find the rate "as of" a date,
// take the entry with the latest effectiveFrom <= that date.
export class BedRateHistory {
  id: string;
  bedId: string;
  rentAmount: number;
  depositAmount: number;
  effectiveFrom: Date;
  createdAt: Date;
}
