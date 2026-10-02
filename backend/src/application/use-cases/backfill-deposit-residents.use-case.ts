import { Inject, Injectable, Logger } from '@nestjs/common';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { Resident } from '../../domain/resident/resident.entity';

export interface BackfillResult {
  processed: number;
  matched: number;
  exactMatches: number;
  partialMatches: number;
  unmatched: Array<{ depositId: string; residentName: string }>;
}

@Injectable()
export class BackfillDepositResidentsUseCase {
  private readonly logger = new Logger(BackfillDepositResidentsUseCase.name);

  constructor(
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly depositRepo: IDepositTransactionRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
  ) {}

  async execute(): Promise<BackfillResult> {
    const result: BackfillResult = {
      processed: 0,
      matched: 0,
      exactMatches: 0,
      partialMatches: 0,
      unmatched: [],
    };

    // Find all deposits without resident link
    const deposits = await this.depositRepo.findAll();
    const unlinked = deposits.filter(d => !d.residentId);
    result.processed = unlinked.length;

    if (unlinked.length === 0) {
      this.logger.log('[backfill-deposit-residents] No unlinked deposits found');
      return result;
    }

    // Load all residents for matching
    const residents = await this.residentRepo.findAll();

    // Process each unlinked deposit
    for (const deposit of unlinked) {
      if (!deposit.residentName) {
        result.unmatched.push({ depositId: deposit.id, residentName: '(empty)' });
        continue;
      }

      const matched = this.findResident(deposit.residentName, residents);
      if (!matched) {
        result.unmatched.push({ depositId: deposit.id, residentName: deposit.residentName });
        continue;
      }

      // Update deposit with matched resident
      await this.depositRepo.save({
        id: deposit.id,
        residentId: matched.id,
      });

      result.matched++;
      if (matched.matchType === 'exact') result.exactMatches++;
      if (matched.matchType === 'partial') result.partialMatches++;

      this.logger.log(
        `[backfill-deposit-residents] Linked deposit "${deposit.residentName}" → resident ${matched.resident.id}`,
      );
    }

    this.logger.log(
      `[backfill-deposit-residents] Complete: ${result.matched}/${result.processed} matched ` +
        `(${result.exactMatches} exact, ${result.partialMatches} partial), ${result.unmatched.length} unmatched`,
    );

    return result;
  }

  private findResident(
    depositName: string,
    residents: Resident[],
  ): { resident: Resident; matchType: 'exact' | 'partial' } | null {
    const nameNorm = depositName.toLowerCase().trim();

    // First pass: exact case-insensitive match
    for (const r of residents) {
      if (r.fullName?.toLowerCase().trim() === nameNorm) {
        return { resident: r, matchType: 'exact' };
      }
    }

    // Second pass: safe partial match (first and last name components)
    const nameParts = nameNorm.split(/\s+/).filter(p => p.length > 0);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];

      for (const r of residents) {
        if (!r.fullName) continue;
        const residentParts = r.fullName.toLowerCase().trim().split(/\s+/).filter(p => p.length > 0);
        if (residentParts.length >= 2) {
          const rFirstName = residentParts[0];
          const rLastName = residentParts[residentParts.length - 1];
          // Both first and last name must match
          if (firstName === rFirstName && lastName === rLastName) {
            return { resident: r, matchType: 'partial' };
          }
        }
      }
    }

    return null;
  }
}
