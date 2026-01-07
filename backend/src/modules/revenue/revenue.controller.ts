import { Controller, Get } from '@nestjs/common';
import { RevenueService } from './revenue.service';

@Controller('admin/revenue')
export class RevenueController {
  constructor(private readonly revenue: RevenueService) {}

  @Get('overview')
  getOverview() {
    return this.revenue.overview();
  }

  @Get('projects/:id')
  getProjectSummary(id: string) {
    return this.revenue.projectSummary(id);
  }
}
