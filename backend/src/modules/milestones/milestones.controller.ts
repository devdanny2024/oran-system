import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { MilestoneStatus } from '@prisma/client';

@Controller('projects/:projectId/milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    return this.milestonesService.listForProject(projectId);
  }

  @Patch(':milestoneId/status')
  async updateStatus(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() body: { status: MilestoneStatus },
  ) {
    return this.milestonesService.updateStatus(projectId, milestoneId, body.status);
  }
}
