import { Injectable } from '@nestjs/common';
import { ReportRegistryService } from '../services/report-registry.service';
import { ReportEntityMeta } from '../../domain/custom-report/report-metadata.types';

@Injectable()
export class GetReportEntitiesUseCase {
  constructor(private readonly registry: ReportRegistryService) {}

  execute(): ReportEntityMeta[] {
    return this.registry.listEntities();
  }
}
