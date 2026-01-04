import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() payload: CreateProjectDto) {
    return this.projectsService.create(payload);
  }

  @Get()
  list() {
    return this.projectsService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.projectsService.getById(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Post(':id/request-inspection')
  requestInspection(@Param('id') id: string) {
    return this.projectsService.requestInspection(id);
  }

  @Get(':id/device-shipment')
  getDeviceShipment(@Param('id') id: string) {
    return this.projectsService.getDeviceShipment(id);
  }

  @Patch(':id/device-shipment')
  updateDeviceShipment(
    @Param('id') id: string,
    @Body()
    payload: {
      status?: string;
      locationNote?: string | null;
      estimatedFrom?: string | null;
      estimatedTo?: string | null;
    },
  ) {
    return this.projectsService.updateDeviceShipment(id, payload);
  }
}
