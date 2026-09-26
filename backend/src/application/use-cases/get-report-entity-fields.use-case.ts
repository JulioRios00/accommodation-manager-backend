import { Injectable } from '@nestjs/common';
import { ReportRegistryService } from '../services/report-registry.service';
import { ReportFieldMeta } from '../../domain/custom-report/report-metadata.types';

@Injectable()
export class GetReportEntityFieldsUseCase {
  constructor(private readonly registry: ReportRegistryService) {}

  execute(entityKey: string): ReportFieldMeta[] {
    return this.registry.listFields(entityKey);
  }
}
