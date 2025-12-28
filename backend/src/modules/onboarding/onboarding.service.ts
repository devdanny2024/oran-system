import { Injectable, NotFoundException } from '@nestjs/common';
import { StartOnboardingDto } from './dto/start-onboarding.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async start(payload: StartOnboardingDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: payload.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found for onboarding.');
    }

    const onboarding = await this.prisma.onboardingSession.upsert({
      where: { projectId: payload.projectId },
      create: {
        projectId: payload.projectId,
        projectStatus: payload.projectStatus,
        constructionStage: payload.constructionStage,
        needsInspection: payload.needsInspection ?? false,
        selectedFeatures: payload.selectedFeatures ?? [],
        stairSteps: payload.stairSteps,
      },
      update: {
        projectStatus: payload.projectStatus ?? undefined,
        constructionStage: payload.constructionStage ?? undefined,
        needsInspection: payload.needsInspection ?? undefined,
        selectedFeatures: payload.selectedFeatures ?? undefined,
        stairSteps: payload.stairSteps ?? undefined,
      },
    });

    return onboarding;
  }

  async getByProject(projectId: string) {
    const onboarding = await this.prisma.onboardingSession.findUnique({
      where: { projectId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding session not found for project.');
    }

    return onboarding;
  }
}
