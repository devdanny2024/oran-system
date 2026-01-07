import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestoneStatus, PaymentPlanType, TripStatus } from '@prisma/client';
import { AiService } from '../../infrastructure/ai/ai.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

interface MilestonePlan {
  milestones: {
    title: string;
    description?: string;
    percentage: number;
    items: { quoteItemId: string; quantity: number }[];
  }[];
}

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly paystack: PaystackService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForProject(projectId: string) {
    const milestones = await (this.prisma as any).projectMilestone.findMany({
      where: { projectId },
      orderBy: { index: 'asc' },
    });

    return { items: milestones };
  }

  async updateStatus(
    projectId: string,
    milestoneId: string,
    status: MilestoneStatus,
  ) {
    const milestone = await (this.prisma as any).projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found for this project.');
    }

    const updated = await (this.prisma as any).projectMilestone.update({
      where: { id: milestoneId },
      data: { status },
    });

    return updated;
  }

  async initializePaystackPayment(projectId: string, milestoneId: string) {
    const milestone = await (this.prisma as any).projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found for this project.');
    }

    if (milestone.status === MilestoneStatus.COMPLETED) {
      throw new BadRequestException('Milestone is already completed.');
    }

    // Enforce that only the next milestone in sequence can be paid.
    const nextPending = await (this.prisma as any).projectMilestone.findFirst({
      where: {
        projectId,
        status: { not: MilestoneStatus.COMPLETED },
      },
      orderBy: { index: 'asc' },
    });

    if (nextPending && nextPending.id !== milestoneId) {
      throw new BadRequestException(
        'You can only pay the next milestone in sequence for this project.',
      );
    }

    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    if (!project || !project.user) {
      throw new BadRequestException(
        'Project or project owner not found for payment.',
      );
    }

    const email = project.user.email;
    const amountNaira = Number(milestone.amount ?? 0);

    if (!amountNaira || amountNaira <= 0) {
      throw new BadRequestException(
        'Milestone amount is invalid for payment.',
      );
    }

    const reference = `oran_${projectId}_${milestoneId}_${Date.now()}`;

    // Prefer an explicit callback base URL from the environment; otherwise
    // fall back to the configured frontend base URL so production payments
    // never point to localhost.
    const explicitCallbackBase =
      process.env.PAYSTACK_CALLBACK_BASE_URL as string | undefined;
    const fallbackCallbackBase = `${this.email.getFrontendBaseUrl()}/paystack/callback`;
    const callbackBase = explicitCallbackBase || fallbackCallbackBase;

    const callbackUrl = `${callbackBase}?projectId=${encodeURIComponent(
      projectId,
    )}&milestoneId=${encodeURIComponent(milestoneId)}`;

    const data = await this.paystack.initializeTransaction({
      email,
      amountNaira,
      reference,
      callbackUrl,
      metadata: {
        projectId,
        milestoneId,
      },
    });

    return {
      authorizationUrl: data.authorization_url,
      reference: data.reference,
    };
  }

  async verifyPaystackPayment(projectId: string, reference: string) {
    const data = await this.paystack.verifyTransaction(reference);

    if (data.status !== 'success') {
      throw new BadRequestException(
        'Payment was not successful. Please try again.',
      );
    }

    const metadata = data.metadata ?? {};
    const metaProjectId = metadata.projectId as string | undefined;
    const milestoneId = metadata.milestoneId as string | undefined;

    if (!metaProjectId || !milestoneId) {
      throw new BadRequestException(
        'Payment metadata missing project or milestone information.',
      );
    }

    if (metaProjectId !== projectId) {
      throw new BadRequestException(
        'Payment does not belong to this project.',
      );
    }

    const milestone = await (this.prisma as any).projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found for this project.');
    }

    const updated = await (this.prisma as any).projectMilestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.COMPLETED },
    });

      // After a successful payment and milestone completion, update the
    // project's device shipment with any devices tied to this milestone,
    // then create a tentative site visit in the operations schedule and
    // notify the customer.
      await this.addMilestoneDevicesToShipment(projectId, milestone);
      await this.createOperationsVisitAndNotify(projectId, milestoneId);

    await this.notifications.createAdminNotification({
      type: 'MILESTONE_PAID',
      title: 'Milestone payment completed',
      message: `Milestone ${updated.index} has been paid for project ${projectId}.`,
      sendEmail: true,
    });

    return {
      milestoneId,
      status: updated.status,
    };
  }

  private async addMilestoneDevicesToShipment(projectId: string, milestone: any) {
    const rawItems = Array.isArray(milestone.itemsJson)
      ? (milestone.itemsJson as any[])
      : [];

    if (!rawItems.length) return;

    const quoteItemIds = rawItems
      .map((i) => i?.quoteItemId as string | undefined)
      .filter((id): id is string => typeof id === 'string' && !!id);

    let byId = new Map<string, any>();

    if (quoteItemIds.length > 0) {
      const quoteItems = await (this.prisma as any).quoteItem.findMany({
        where: { id: { in: quoteItemIds } },
      });

      byId = new Map<string, any>(
        quoteItems.map((qi: any) => [qi.id as string, qi]),
      );
    }

    const itemsToAppend = rawItems.map((i: any) => {
      const qi = byId.get(i?.quoteItemId as string);
      return {
        quoteItemId: i?.quoteItemId ?? null,
        quantity:
          typeof i?.quantity === 'number' && i.quantity > 0
            ? i.quantity
            : 1,
        name: qi?.name ?? null,
        category: qi?.category ?? null,
      };
    });

    const existing = await (this.prisma as any).projectDeviceShipment.findUnique({
      where: { projectId },
    });

    if (!existing) {
      await (this.prisma as any).projectDeviceShipment.create({
        data: {
          projectId,
          milestoneId: milestone.id,
          itemsJson: itemsToAppend,
        },
      });
      return;
    }

    const existingItems = Array.isArray(existing.itemsJson)
      ? (existing.itemsJson as any[])
      : [];

    await (this.prisma as any).projectDeviceShipment.update({
      where: { projectId },
      data: {
        itemsJson: [...existingItems, ...itemsToAppend],
      },
    });
  }

  private async createOperationsVisitAndNotify(
    projectId: string,
    milestoneId: string,
  ) {
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: {
        user: true,
        onboarding: true,
      },
    });

    if (!project || !project.user) {
      return;
    }

    const now = new Date();
    const scheduledFor = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 3,
      10,
      0,
      0,
      0,
    );

    const trip = await (this.prisma as any).trip.create({
      data: {
        projectId,
        milestoneId,
        status: TripStatus.SCHEDULED,
        scheduledFor,
        notes:
          'Auto‑scheduled visit after milestone payment. Our team will confirm details within 24 hours.',
      },
    });

    const projectName = project.name as string;
    const customerName =
      (project.user.name as string | null) ?? project.user.email;
    const siteAddress =
      (project.onboarding?.siteAddress as string | null) ?? 'Not provided';

    const frontendBase = this.email.getFrontendBaseUrl();
    const operationsUrl = `${frontendBase}/dashboard/operations?projectId=${encodeURIComponent(
      projectId,
    )}`;

    // Seed a standard operations task list for this auto-scheduled
    // visit so technicians can track wiring → installation → integration.
    await (this.prisma as any).tripTask.createMany({
      data: [
        {
          tripId: trip.id,
          label: 'Wiring & infrastructure preparation',
          sequence: 1,
        },
        {
          tripId: trip.id,
          label: 'Device installation on site',
          sequence: 2,
        },
        {
          tripId: trip.id,
          label: 'Integration, testing & client walkthrough',
          sequence: 3,
        },
      ],
    });

    await this.email.sendOperationsScheduleEmail({
      to: project.user.email as string,
      name: customerName,
      projectName,
      siteAddress,
      scheduledFor,
      operationsUrl,
    });
  }

  async createForPaymentPlan(projectId: string, planType: PaymentPlanType) {
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: {
        onboarding: true,
        quotes: {
          where: { isSelected: true },
          include: { items: true },
        },
      },
    });

    if (!project) {
      throw new BadRequestException('Project not found for milestones.');
    }

    const quote = project.quotes[0];
    if (!quote) {
      throw new BadRequestException(
        'No selected quote found for project milestones.',
      );
    }

    // Clear existing milestones for this project.
    await (this.prisma as any).projectMilestone.deleteMany({
      where: { projectId },
    });

    const aiPlan = await this.tryGenerateMilestonePlan({
      planType,
      project,
      onboarding: project.onboarding,
      quote,
    });

    const milestones =
      aiPlan && aiPlan.milestones && aiPlan.milestones.length === 3
        ? aiPlan.milestones
        : this.buildFallbackPlan(planType, quote);

    const total = Number(quote.total);

    const created = await this.prisma.$transaction((tx: any) => {
      return Promise.all(
        milestones.map((m, index) => {
          const pct = Math.max(0, Math.min(100, Math.round(m.percentage)));

          const isLast = index === milestones.length - 1;
          let amount = Math.round((total * pct) / 100);

          // Ensure the sum of milestone amounts matches the quote total.
          if (isLast) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            tx.projectMilestone
              .aggregate({
                where: { projectId },
                _sum: { amount: true },
              })
              .then((agg: any) => {
                const currentSum = Number(agg?._sum?.amount ?? 0);
                const remaining = total - currentSum;
                if (remaining > 0) {
                  amount = remaining;
                }
              })
              .catch(() => undefined);
          }

          return tx.projectMilestone.create({
            data: {
              projectId,
              planType,
              index: index + 1,
              title: m.title,
              description: m.description ?? null,
              percentage: pct,
              amount,
              itemsJson: m.items,
              status: MilestoneStatus.PENDING,
            },
          });
        }),
      );
    });

    return created;
  }

  private async tryGenerateMilestonePlan(input: {
    planType: PaymentPlanType;
    project: any;
    onboarding: any;
    quote: any;
  }): Promise<MilestonePlan | null> {
    try {
      const result = await this.ai.generateMilestonePlan({
        planType: input.planType,
        project: {
          roomsCount: input.project.roomsCount ?? null,
          buildingType: input.project.buildingType ?? null,
        },
        onboarding: input.onboarding
          ? {
              projectStatus: input.onboarding.projectStatus ?? null,
              constructionStage: input.onboarding.constructionStage ?? null,
              needsInspection: input.onboarding.needsInspection ?? null,
              selectedFeatures: input.onboarding.selectedFeatures ?? null,
              stairSteps: input.onboarding.stairSteps ?? null,
            }
          : null,
        quote: {
          id: input.quote.id,
          total: Number(input.quote.total),
          items: input.quote.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            totalPrice: Number(item.totalPrice),
          })),
        },
      });

      if (!result) return null;
      if (!Array.isArray(result.milestones)) return null;
      if (result.milestones.length !== 3) return null;

      return result;
    } catch {
      return null;
    }
  }

  private buildFallbackPlan(planType: PaymentPlanType, quote: any): {
    title: string;
    description: string;
    percentage: number;
    items: { quoteItemId: string; quantity: number }[];
  }[] {
    const baseItems = quote.items as any[];

    const infraCategories = new Set(['GATE', 'STAIRCASE', 'SURVEILLANCE']);
    const comfortCategories = new Set(['LIGHTING', 'CLIMATE', 'ACCESS']);

    const sorted = [...baseItems].sort((a, b) => {
      const aInfra = infraCategories.has(a.category);
      const bInfra = infraCategories.has(b.category);
      if (aInfra !== bInfra) return aInfra ? -1 : 1;
      const aComfort = comfortCategories.has(a.category);
      const bComfort = comfortCategories.has(b.category);
      if (aComfort !== bComfort) return aComfort ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const chunkSize = Math.ceil(sorted.length / 3) || 1;

    const chunks: any[][] = [
      sorted.slice(0, chunkSize),
      sorted.slice(chunkSize, chunkSize * 2),
      sorted.slice(chunkSize * 2),
    ];

    const percentages =
      planType === PaymentPlanType.EIGHTY_TEN_TEN
        ? [80, 10, 10]
        : [40, 40, 20];

    const titles =
      planType === PaymentPlanType.EIGHTY_TEN_TEN
        ? [
            'Initial mobilisation & equipment',
            'Installation progress payment',
            'Final testing & handover',
          ]
        : [
            'Mobilisation & infrastructure',
            'Main installation & configuration',
            'Finishing touches & handover',
          ];

    const descriptions = [
      'Covers mobilisation, core infrastructure and long-lead items.',
      'Covers most on-site installation and configuration work.',
      'Covers final optimisation, walkthrough and project sign-off.',
    ];

    return chunks.map((chunk, index) => ({
      title: titles[index],
      description: descriptions[index],
      percentage: percentages[index],
      items: chunk.map((item: any) => ({
        quoteItemId: item.id,
        quantity: item.quantity,
      })),
    }));
  }
}
