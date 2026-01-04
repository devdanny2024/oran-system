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

  async getDeviceShipment(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    let shipment = await (this.prisma as any).projectDeviceShipment.findUnique({
      where: { projectId },
    });

    if (!shipment) {
      // Best-effort: derive initial devices from the first milestone's items.
      const firstMilestone = await (this.prisma as any).projectMilestone.findFirst(
        {
          where: { projectId },
          orderBy: { index: 'asc' },
        },
      );

      let items: any[] = [];

      if (firstMilestone?.itemsJson) {
        try {
          const rawItems = firstMilestone.itemsJson as any[];
          const quoteItemIds = rawItems
            .map((i) => i.quoteItemId as string | undefined)
            .filter(Boolean);

          if (quoteItemIds.length > 0) {
            const quoteItems = await (this.prisma as any).quoteItem.findMany({
              where: { id: { in: quoteItemIds } },
            });

            const byId = new Map(
              quoteItems.map((qi: any) => [qi.id as string, qi]),
            );

            items = rawItems.map((i: any) => {
              const qi = byId.get(i.quoteItemId as string);
              return {
                quoteItemId: i.quoteItemId,
                quantity: i.quantity,
                name: qi?.name ?? null,
                category: qi?.category ?? null,
              };
            });
          }
        } catch {
          items = [];
        }
      }

      shipment = await (this.prisma as any).projectDeviceShipment.create({
        data: {
          projectId,
          milestoneId: firstMilestone?.id ?? null,
          itemsJson: items,
        },
      });
    }

    return shipment;
  }

  async updateDeviceShipment(projectId: string, payload: {
    status?: string;
    locationNote?: string | null;
    estimatedFrom?: string | null;
    estimatedTo?: string | null;
  }) {
    const existing = await (this.prisma as any).projectDeviceShipment.findUnique({
      where: { projectId },
    });

    if (!existing) {
      throw new NotFoundException('Device shipment not found for this project.');
    }

    const data: any = {};

    if (typeof payload.status === 'string' && payload.status) {
      data.status = payload.status as any;
    }

    if (payload.locationNote !== undefined) {
      const note = payload.locationNote?.trim();
      data.locationNote = note && note.length ? note : null;
    }

    if (payload.estimatedFrom !== undefined) {
      data.estimatedFrom = payload.estimatedFrom
        ? new Date(payload.estimatedFrom)
        : null;
    }

    if (payload.estimatedTo !== undefined) {
      data.estimatedTo = payload.estimatedTo
        ? new Date(payload.estimatedTo)
        : null;
    }

    const updated = await (this.prisma as any).projectDeviceShipment.update({
      where: { projectId },
      data,
    });

    return updated;
  }

  async requestInspection(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { onboarding: true, user: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const address = project.onboarding?.siteAddress ?? '';
    const lowered = address.toLowerCase();

    const isLagos = lowered.includes('lagos');

    const westernStates = [
      'ogun',
      'osun',
      'oyo',
      'ibadan',
      'ondo',
      'ekiti',
      'kwara',
    ];

    const isWesternNonLagos =
      !isLagos && westernStates.some((state) => lowered.includes(state));

    const fee =
      isLagos ? 20000 : isWesternNonLagos ? 40000 : 100000;

    // Update project status so admin/ops can see this in their views.
    await this.prisma.project.update({
      where: { id },
      data: { status: 'INSPECTION_REQUESTED' as any },
    });

    return {
      projectId: id,
      inspectionFee: fee,
      currency: 'NGN',
      inferredRegion: isLagos
        ? 'LAGOS'
        : isWesternNonLagos
        ? 'WESTERN_STATE'
        : 'OTHER',
      siteAddress: address || null,
    };
  }

  async delete(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      const quotes = await tx.quote.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const quoteIds = quotes.map((q) => q.id);

      if (quoteIds.length > 0) {
        await tx.quoteItem.deleteMany({
          where: { quoteId: { in: quoteIds } },
        });
      }

      await tx.quote.deleteMany({
        where: { projectId: id },
      });

      await tx.trip.deleteMany({
        where: { projectId: id },
      });

      await tx.onboardingSession.deleteMany({
        where: { projectId: id },
      });

      await tx.projectAgreement.deleteMany({
        where: { projectId: id },
      });

      await tx.projectMilestone.deleteMany({
        where: { projectId: id },
      });

      await tx.paymentPlan.deleteMany({
        where: { projectId: id },
      });

      await tx.project.delete({
        where: { id },
      });
    });

    return { success: true };
  }
}
