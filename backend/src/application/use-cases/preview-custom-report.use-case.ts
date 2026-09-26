import { Injectable } from '@nestjs/common';
import { ReportQueryService } from '../services/report-query.service';
import { ReportQueryRequest, ReportQueryResult } from '../../domain/custom-report/report-metadata.types';

const PREVIEW_ROW_CAP = 500;

@Injectable()
export class PreviewCustomReportUseCase {
  constructor(private readonly queryService: ReportQueryService) {}

  execute(request: ReportQueryRequest): Promise<ReportQueryResult> {
    return this.queryService.run(request, PREVIEW_ROW_CAP);
  }
}
