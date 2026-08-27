import { BedRateHistory } from './bed-rate-history.entity';

export interface IBedRateHistoryRepository {
  save(entry: Omit<BedRateHistory, 'id' | 'createdAt'>): Promise<BedRateHistory>;
  findByBedId(bedId: string): Promise<BedRateHistory[]>;
  /** The rate in effect at `asOf` (latest entry with effectiveFrom <= asOf), across all beds. */
  findAsOf(asOf: Date): Promise<BedRateHistory[]>;
}

export const BED_RATE_HISTORY_REPOSITORY = 'BED_RATE_HISTORY_REPOSITORY';
