import { Controller, Get, Param } from '@nestjs/common';
import { MilestonesService } from './milestones.service';

@Controller('projects/:projectId/milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    return this.milestonesService.listForProject(projectId);
  }
}

