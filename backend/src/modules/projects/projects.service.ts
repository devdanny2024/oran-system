import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  async create(payload: CreateProjectDto) {
    return {
      message: 'Create project not yet implemented',
      payload,
    };
  }

  async list() {
    return {
      message: 'List projects not yet implemented',
      items: [],
    };
  }

  async getById(id: string) {
    return {
      message: 'Get project not yet implemented',
      id,
    };
  }
}

