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
        devicesCost?: number;
        technicianCostInstall?: number;
        technicianCostIntegration?: number;
        taxAmount?: number;
        grossRevenue?: number;
        profit?: number;
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
        devicesCost: 0,
        technicianCostInstall: 0,
        technicianCostIntegration: 0,
        taxAmount: 0,
        grossRevenue: 0,
        profit: 0,
      };

      existing.totalAmount += amount;

      if (m.status === 'COMPLETED') {
        existing.collectedAmount += amount;
        totalCollected += amount;
      }

      perProjectMap.set(key, existing);
    }

    const projectIds = Array.from(perProjectMap.keys());

    // Enrich each project with device and technician costs based on its main quote.
    for (const projectId of projectIds) {
      const entry = perProjectMap.get(projectId);
      if (!entry) continue;

      const quote = await (this.prisma as any).quote.findFirst({
        where: { projectId },
        orderBy: [
          { isSelected: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!quote) {
        // No quote yet; keep cost/profit fields at zero.
        continue;
      }

      let devicesCost = 0;
      let technicianCostInstall = 0;
      let technicianCostIntegration = 0;

      for (const item of quote.items as any[]) {
        const quantity = Number(item.quantity ?? 0);
        if (!quantity || quantity <= 0) continue;

        const product = item.product as any | undefined;
        const unitCost = product
          ? Number(
              product.ourPrice ?? product.marketPrice ?? item.unitPrice ?? 0,
            )
          : Number(item.unitPrice ?? 0);

        devicesCost += unitCost * quantity;

        if (product) {
          const installTech =
            Number(product.installTechnicianFee ?? 0) * quantity;
          const integrationTech =
            Number(product.integrationTechnicianFee ?? 0) * quantity;

          technicianCostInstall += installTech;
          technicianCostIntegration += integrationTech;
        }
      }

      // Only treat amounts actually collected as revenue when computing profit.
      const grossRevenue = Number(entry.collectedAmount ?? 0);
      const taxAmount = Number((quote as any).taxAmount ?? 0);
      const technicianCost = technicianCostInstall + technicianCostIntegration;

      const profit =
        grossRevenue > 0
          ? grossRevenue - (devicesCost + technicianCost + taxAmount)
          : 0;

      entry.devicesCost = devicesCost;
      entry.technicianCostInstall = technicianCostInstall;
      entry.technicianCostIntegration = technicianCostIntegration;
      entry.taxAmount = taxAmount;
      entry.grossRevenue = grossRevenue;
      entry.profit = profit;

      perProjectMap.set(projectId, entry);
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

  async projectSummary(projectId: string) {
    const overview = await this.overview();
    const match = overview.perProject.find(
      (p) => p.projectId === projectId,
    );
    if (!match) {
      return null;
    }
    return match;
  }
}
