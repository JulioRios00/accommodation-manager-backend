import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportXlsxUseCase } from '../../application/use-cases/import-xlsx.use-case';
import { ImportBillsUseCase } from '../../application/use-cases/import-bills.use-case';
import { ImportMaintenanceUseCase } from '../../application/use-cases/import-maintenance.use-case';
import { ImportDepositsUseCase } from '../../application/use-cases/import-deposits.use-case';
import { ImportLandlordPaymentsUseCase } from '../../application/use-cases/import-landlord-payments.use-case';
import { ImportResidentPaymentsUseCase } from '../../application/use-cases/import-resident-payments.use-case';
import { ImportResidentsToClerkUseCase } from '../../application/use-cases/import-residents-to-clerk.use-case';
import { ImportSkipReason } from '../../application/use-cases/import-deposits.use-case';
import { Roles } from '../decorators/roles.decorator';

const fileGuard = (file: Express.Multer.File) => {
  if (!file) throw new BadRequestException('No file provided');
};

// Turns [{ reason: 'Property "61RR" not found' }, ...] into "85 property not found, 14 duplicate payment".
const summarizeSkips = (skipReasons: ImportSkipReason[]): string => {
  if (!skipReasons.length) return '';
  const counts = new Map<string, number>();
  for (const { reason } of skipReasons) {
    // Collapse reasons carrying a specific value (e.g. `Property "61RR" not found`)
    // into one bucket per category (`Property not found`) so the summary stays short.
    const category = reason.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${count} ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`)
    .join(', ');
};

@Controller('import')
export class ImportController {
  constructor(
    private readonly importXlsxUseCase: ImportXlsxUseCase,
    private readonly importBillsUseCase: ImportBillsUseCase,
    private readonly importMaintenanceUseCase: ImportMaintenanceUseCase,
    private readonly importDepositsUseCase: ImportDepositsUseCase,
    private readonly importLandlordPaymentsUseCase: ImportLandlordPaymentsUseCase,
    private readonly importResidentPaymentsUseCase: ImportResidentPaymentsUseCase,
    private readonly importResidentsToClerkUseCase: ImportResidentsToClerkUseCase,
  ) {}

  @Post()
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importAccommodation(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importXlsxUseCase.execute(file.buffer);
    return {
      message: `Imported ${result.imported} beds, ${result.historicalImported} historical (checked-out) bookings`,
      ...result,
    };
  }

  @Post('bills')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importBills(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importBillsUseCase.execute(file.buffer);
    const gprnNote = result.gprnConflicts ? `, ${result.gprnConflicts} GPRN conflicts kept previous value` : '';
    const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
    return { message: `Updated ${result.updated} property utility records (${result.skipped} skipped${gprnNote}${skipNote})`, ...result };
  }

  @Post('maintenance')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importMaintenance(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importMaintenanceUseCase.execute(file.buffer);
    const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
    return { message: `Imported ${result.imported} maintenance tickets (${result.skipped} skipped${skipNote})`, ...result };
  }

  @Post('deposits')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importDeposits(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importDepositsUseCase.execute(file.buffer);
    const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
    return { message: `Imported ${result.imported} deposit transactions (${result.skipped} skipped${skipNote})`, ...result };
  }

  @Post('landlord-payments')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importLandlordPayments(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importLandlordPaymentsUseCase.execute(file.buffer);
    const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
    return { message: `Imported ${result.imported} landlord payments (${result.skipped} skipped${skipNote})`, ...result };
  }

  @Post('resident-payments')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importResidentPayments(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importResidentPaymentsUseCase.execute(file.buffer);
    const skipNote = result.skipped ? ` — ${summarizeSkips(result.skipReasons)}` : '';
    return { message: `Imported ${result.imported} resident payments (${result.skipped} skipped${skipNote})`, ...result };
  }

  @Post('residents-clerk')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importResidentsToClerk(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importResidentsToClerkUseCase.execute(file.buffer);
    return {
      message: `Clerk provisioning complete — ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`,
      ...result,
    };
  }
}
