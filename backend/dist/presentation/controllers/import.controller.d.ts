import { ImportJobsService } from '../../application/services/import-jobs.service';
import { ImportXlsxUseCase } from '../../application/use-cases/import-xlsx.use-case';
import { ImportBillsUseCase } from '../../application/use-cases/import-bills.use-case';
import { ImportMaintenanceUseCase } from '../../application/use-cases/import-maintenance.use-case';
import { ImportDepositsUseCase } from '../../application/use-cases/import-deposits.use-case';
import { ImportLandlordPaymentsUseCase } from '../../application/use-cases/import-landlord-payments.use-case';
import { ImportResidentPaymentsUseCase } from '../../application/use-cases/import-resident-payments.use-case';
import { ImportResidentsToClerkUseCase } from '../../application/use-cases/import-residents-to-clerk.use-case';
import { ImportSkipReason } from '../../application/use-cases/import-deposits.use-case';
export declare class ImportController {
    private readonly importJobs;
    private readonly importXlsxUseCase;
    private readonly importBillsUseCase;
    private readonly importMaintenanceUseCase;
    private readonly importDepositsUseCase;
    private readonly importLandlordPaymentsUseCase;
    private readonly importResidentPaymentsUseCase;
    private readonly importResidentsToClerkUseCase;
    private readonly logger;
    constructor(importJobs: ImportJobsService, importXlsxUseCase: ImportXlsxUseCase, importBillsUseCase: ImportBillsUseCase, importMaintenanceUseCase: ImportMaintenanceUseCase, importDepositsUseCase: ImportDepositsUseCase, importLandlordPaymentsUseCase: ImportLandlordPaymentsUseCase, importResidentPaymentsUseCase: ImportResidentPaymentsUseCase, importResidentsToClerkUseCase: ImportResidentsToClerkUseCase);
    importAccommodation(file: Express.Multer.File): {
        jobId: string;
    };
    getImportStatus(jobId: string): import("../../application/services/import-jobs.service").ImportJob;
    importBills(file: Express.Multer.File): Promise<{
        updated: number;
        skipped: number;
        gprnConflicts: number;
        skipReasons: ImportSkipReason[];
        message: string;
    }>;
    importMaintenance(file: Express.Multer.File): Promise<{
        imported: number;
        skipped: number;
        skipReasons: ImportSkipReason[];
        message: string;
    }>;
    importDeposits(file: Express.Multer.File): Promise<{
        imported: number;
        skipped: number;
        skipReasons: ImportSkipReason[];
        message: string;
    }>;
    importLandlordPayments(file: Express.Multer.File): Promise<{
        imported: number;
        skipped: number;
        skipReasons: ImportSkipReason[];
        message: string;
    }>;
    importResidentPayments(file: Express.Multer.File): Promise<{
        imported: number;
        skipped: number;
        skipReasons: ImportSkipReason[];
        message: string;
    }>;
    importResidentsToClerk(file: Express.Multer.File): Promise<{
        created: number;
        skipped: number;
        errors: {
            email: string;
            reason: string;
        }[];
        message: string;
    }>;
}
