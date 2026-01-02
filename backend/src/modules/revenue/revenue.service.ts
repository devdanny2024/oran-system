import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentPlanType } from '@prisma/client';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const milestones = await (this.prisma as any).projectMilestone.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            userId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalCollected = 0;
    let totalProjected = 0;

    const perProjectMap = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        planType: PaymentPlanType;
        totalAmount: number;
        collectedAmount: number;
      }
    >();

    for (const m of milestones as any[]) {
      const amount = Number(m.amount ?? 0);

      totalProjected += amount;

      const key = m.projectId as string;
      const existing = perProjectMap.get(key) ?? {
        projectId: key,
        projectName: (m.project?.name as string) ?? 'Untitled project',
        planType: m.planType as PaymentPlanType,
        totalAmount: 0,
        collectedAmount: 0,
      };

      existing.totalAmount += amount;

      if (m.status === 'COMPLETED') {
        existing.collectedAmount += amount;
        totalCollected += amount;
      }

      perProjectMap.set(key, existing);
    }

    const perProject = Array.from(perProjectMap.values()).sort(
      (a, b) => a.projectName.localeCompare(b.projectName),
    );

    return {
      totalProjected,
      totalCollected,
      perProject,
    };
  }
}

