import { Controller, Get } from '@nestjs/common';
import { GetDashboardStatsUseCase } from '../../application/use-cases/get-dashboard-stats.use-case';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboardStats: GetDashboardStatsUseCase) {}

  @Get('stats')
  async getStats() {
    return this.getDashboardStats.execute();
  }
}
