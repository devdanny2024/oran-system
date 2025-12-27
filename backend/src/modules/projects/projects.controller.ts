import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
}

