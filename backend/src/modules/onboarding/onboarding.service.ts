import { Injectable, NotFoundException } from '@nestjs/common';
import { StartOnboardingDto } from './dto/start-onboarding.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
        siteAddress: payload.siteAddress,
        contactPhone: payload.contactPhone,
      },
      update: {
        projectStatus: payload.projectStatus ?? undefined,
        constructionStage: payload.constructionStage ?? undefined,
        needsInspection: payload.needsInspection ?? undefined,
        selectedFeatures: payload.selectedFeatures ?? undefined,
        stairSteps: payload.stairSteps ?? undefined,
        siteAddress: payload.siteAddress ?? undefined,
        contactPhone: payload.contactPhone ?? undefined,
      },
    });

    if (payload.needsInspection) {
      await this.notifications.createAdminNotification({
        type: 'ONBOARDING_NEEDS_INSPECTION',
        title: 'Onboarding indicates inspection needed',
        message: `Project ${project.name} (${project.id}) marked as needing inspection during onboarding.`,
        sendEmail: false,
      });
    }

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
