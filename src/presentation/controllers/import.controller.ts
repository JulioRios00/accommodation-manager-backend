import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportXlsxUseCase } from '../../application/use-cases/import-xlsx.use-case';
import { ImportBillsUseCase } from '../../application/use-cases/import-bills.use-case';
import { ImportMaintenanceUseCase } from '../../application/use-cases/import-maintenance.use-case';
import { ImportDepositsUseCase } from '../../application/use-cases/import-deposits.use-case';
import { ImportLandlordPaymentsUseCase } from '../../application/use-cases/import-landlord-payments.use-case';
import { ImportResidentPaymentsUseCase } from '../../application/use-cases/import-resident-payments.use-case';
import { ImportResidentsToClerkUseCase } from '../../application/use-cases/import-residents-to-clerk.use-case';
import { Roles } from '../decorators/roles.decorator';

const fileGuard = (file: Express.Multer.File) => {
  if (!file) throw new BadRequestException('No file provided');
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
    return { message: `Updated ${result.updated} property utility records (${result.skipped} skipped${gprnNote})`, ...result };
  }

  @Post('maintenance')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importMaintenance(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importMaintenanceUseCase.execute(file.buffer);
    return { message: `Imported ${result.imported} maintenance tickets (${result.skipped} skipped)`, ...result };
  }

  @Post('deposits')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importDeposits(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importDepositsUseCase.execute(file.buffer);
    return { message: `Imported ${result.imported} deposit transactions (${result.skipped} skipped)`, ...result };
  }

  @Post('landlord-payments')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importLandlordPayments(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importLandlordPaymentsUseCase.execute(file.buffer);
    return { message: `Imported ${result.imported} landlord payments (${result.skipped} skipped)`, ...result };
  }

  @Post('resident-payments')
  @Roles('sysadmin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  async importResidentPayments(@UploadedFile() file: Express.Multer.File) {
    fileGuard(file);
    const result = await this.importResidentPaymentsUseCase.execute(file.buffer);
    return { message: `Imported ${result.imported} resident payments (${result.skipped} skipped)`, ...result };
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
