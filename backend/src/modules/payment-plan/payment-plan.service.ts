import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentPlanType, ProjectStatus } from '@prisma/client';
import { MilestonesService } from '../milestones/milestones.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly milestones: MilestonesService,
    private readonly notifications: NotificationsService,
  ) {}

  async getForProject(projectId: string) {
    const plan = await (this.prisma as any).paymentPlan.findUnique({
      where: { projectId },
    });
    return plan ?? null;
  }

  async setForProject(projectId: string, type: PaymentPlanType) {
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { paymentPlan: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (
      project.status !== 'DOCUMENTS_SIGNED' &&
      project.status !== 'PAYMENT_PLAN_SELECTED'
    ) {
      throw new BadRequestException(
        'Payment plan can only be chosen after documents are signed.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const plan = await tx.paymentPlan.upsert({
        where: { projectId },
        update: { type },
        create: { projectId, type },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.PAYMENT_PLAN_SELECTED },
      });

      return plan;
    });

    // Generate or refresh milestone breakdown for this project
    // based on the chosen payment plan and selected quote.
    await this.milestones.createForPaymentPlan(projectId, type);

    await this.notifications.createAdminNotification({
      type: 'PAYMENT_PLAN_SET',
      title: 'Payment plan chosen for project',
      message: `Project ${projectId} selected payment plan ${type}.`,
      sendEmail: true,
    });

    return updated;
  }
}
