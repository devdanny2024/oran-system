import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MilestoneStatus, PaymentPlanType } from '@prisma/client';
import { AiService } from '../../infrastructure/ai/ai.service';

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
  ) {}

  async listForProject(projectId: string) {
    const milestones = await (this.prisma as any).projectMilestone.findMany({
      where: { projectId },
      orderBy: { index: 'asc' },
    });

    return { items: milestones };
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

