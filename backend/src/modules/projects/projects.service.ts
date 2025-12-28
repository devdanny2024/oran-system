import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProjectDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found for project.');
    }

    const project = await this.prisma.project.create({
      data: {
        name: payload.name,
        userId: payload.userId,
        buildingType: payload.buildingType,
        roomsCount: payload.roomsCount ?? null,
      },
      include: { onboarding: true },
    });

    return project;
  }

  async list() {
    const projects = await this.prisma.project.findMany({
      include: { onboarding: true },
      orderBy: { createdAt: 'desc' },
    });

    return { items: projects };
  }

  async getById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { onboarding: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}
