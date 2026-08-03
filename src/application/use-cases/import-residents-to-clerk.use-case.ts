import { Inject, Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { createClerkClient } from '@clerk/backend';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';

export interface ClerkImportRow {
  fullName: string;
  email: string;
  dateOfBirth: string | null;
}

export interface ClerkImportResult {
  created: number;
  skipped: number;
  errors: { email: string; reason: string }[];
}

@Injectable()
export class ImportResidentsToClerkUseCase {
  private readonly logger = new Logger(ImportResidentsToClerkUseCase.name);
  private readonly clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
  ) {}

  async execute(buffer: Buffer): Promise<ClerkImportResult> {
    const rows = this.parseBuffer(buffer);
    const result: ClerkImportResult = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      if (!row.email || !row.fullName) {
        result.errors.push({ email: row.email ?? '(blank)', reason: 'Missing full name or email' });
        continue;
      }
      if (!row.dateOfBirth) {
        result.errors.push({ email: row.email, reason: 'Missing date of birth — required for password generation' });
        continue;
      }

      try {
        const existing = await this.residentRepo.findByEmail(row.email);
        if (existing?.clerkUserId) {
          this.logger.debug(`[clerk-import] skip — already linked: ${row.email}`);
          result.skipped++;
          continue;
        }

        const nameParts = row.fullName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        const password = this.buildPassword(row.dateOfBirth, lastName);

        const clerkUser = await this.clerkClient.users.createUser({
          emailAddress: [row.email.trim().toLowerCase()],
          password,
          firstName,
          lastName: lastName || undefined,
          publicMetadata: { role: 'resident' },
          skipPasswordChecks: true,
        });

        this.logger.log(`[clerk-import] created Clerk user: ${clerkUser.id} for ${row.email}`);

        if (existing) {
          await this.residentRepo.save({ id: existing.id, clerkUserId: clerkUser.id });
        } else {
          await this.residentRepo.save({
            fullName: row.fullName.trim(),
            email: row.email.trim().toLowerCase(),
            clerkUserId: clerkUser.id,
          } as any);
        }

        result.created++;
      } catch (err: any) {
        const message: string = err?.errors?.[0]?.message ?? err?.message ?? 'Unknown error';
        this.logger.warn(`[clerk-import] error for ${row.email}: ${message}`);
        result.errors.push({ email: row.email, reason: message });
      }
    }

    return result;
  }

  /** Password = DDMMYYYY + LastName, e.g. "15011990Murphy" */
  private buildPassword(rawDob: string, lastName: string): string {
    const date = this.parseDob(rawDob);
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    return `${dd}${mm}${yyyy}${lastName}`;
  }

  /**
   * Accepts multiple date formats from Excel:
   *  - JS Date (xlsx serial → Date when cellDates: true)
   *  - ISO string "1990-01-15"
   *  - DD/MM/YYYY or DD-MM-YYYY
   *  - Excel serial number (number → Date via xlsx)
   */
  private parseDob(raw: string): Date {
    // xlsx may return a Date object serialised as ISO string after sheet_to_json
    const iso = new Date(raw);
    if (!isNaN(iso.getTime())) return iso;

    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = raw.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      if (y > 1000) return new Date(Date.UTC(y, m - 1, d)); // DD/MM/YYYY
      return new Date(Date.UTC(d, m - 1, y));                // YYYY/MM/DD fallback
    }

    throw new Error(`Unrecognised date format: "${raw}"`);
  }

  private parseBuffer(buffer: Buffer): ClerkImportRow[] {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    return raw.map((r) => {
      const keys = Object.keys(r);
      const nameKey  = keys.find(k => /name/i.test(k))  ?? keys[0];
      const emailKey = keys.find(k => /email/i.test(k)) ?? keys[1];
      const dobKey   = keys.find(k => /birth|dob/i.test(k)) ?? keys[2];

      const rawDob = r[dobKey];
      const dobStr = rawDob instanceof Date
        ? rawDob.toISOString()
        : String(rawDob ?? '').trim();

      return {
        fullName:    String(r[nameKey]  ?? '').trim(),
        email:       String(r[emailKey] ?? '').trim(),
        dateOfBirth: dobStr || null,
      };
    }).filter(r => r.email);
  }
}
