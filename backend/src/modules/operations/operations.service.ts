import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { InviteTechnicianDto } from './dto/invite-technician.dto';
import { RevokeTechnicianDto } from './dto/revoke-technician.dto';
import { TripStatus, UserRole, MilestoneStatus, PriceTier } from '@prisma/client';
import { EmailService } from '../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { MilestonesService } from '../milestones/milestones.service';
import {
  computeQuoteFees,
  QuoteFeeConfig,
} from '../../domain/pricing/quote-fees';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly milestones: MilestonesService,
    private readonly notifications: NotificationsService,
  ) {}

  async createTrip(payload: CreateTripDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: payload.projectId },
      include: { user: true, onboarding: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found for trip.');
    }

    let technicianId: string | undefined = payload.technicianId;

    if (technicianId) {
      const technician = await this.prisma.user.findUnique({
        where: { id: technicianId },
      });

      if (!technician || technician.role !== UserRole.TECHNICIAN) {
        throw new BadRequestException('Technician user not found.');
      }
    } else {
      // Auto-assign a technician "on ground" with fewer than 5 active projects.
      // If all technicians already have 5+ projects, we leave the trip
      // unassigned so the existing client messaging still applies.
      const technicians = await this.prisma.user.findMany({
        where: { role: UserRole.TECHNICIAN },
        select: { id: true },
      });

      if (technicians.length > 0) {
        const trips = await this.prisma.trip.findMany({
          where: {
            technicianId: { in: technicians.map((t) => t.id) },
          },
          select: {
            technicianId: true,
            projectId: true,
          },
        });

        const projectCounts = new Map<string, number>();
        for (const t of trips) {
          if (!t.technicianId) continue;
          const key = `${t.technicianId}:${t.projectId}`;
          // Count distinct projects per technician.
          if (!projectCounts.has(key)) {
            projectCounts.set(key, 1);
          }
        }

        const loadByTechnician = new Map<string, number>();
        for (const tech of technicians) {
          loadByTechnician.set(tech.id, 0);
        }
        for (const key of projectCounts.keys()) {
          const [techId] = key.split(':');
          loadByTechnician.set(
            techId,
            (loadByTechnician.get(techId) ?? 0) + 1,
          );
        }

        const candidates = technicians
          .map((t) => ({
            id: t.id,
            projectsCount: loadByTechnician.get(t.id) ?? 0,
          }))
          .filter((t) => t.projectsCount < 5)
          .sort((a, b) => a.projectsCount - b.projectsCount);

        if (candidates.length > 0) {
          technicianId = candidates[0].id;
        }
      }
    }

    const scheduledFor = new Date(payload.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('Invalid scheduled date.');
    }

    const trip = await this.prisma.trip.create({
      data: {
        projectId: payload.projectId,
        technicianId,
        scheduledFor,
        notes: payload.notes,
      },
    });

    // Seed a simple, standard task list for every trip so that
    // technicians can track wiring → installation → integration.
    await this.prisma.tripTask.createMany({
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

    // If this is the first scheduled visit after an inspection request,
    // mark the project as INSPECTION_SCHEDULED and notify the customer.
    if (
      project.status === 'INSPECTION_REQUESTED' ||
      project.status === 'INSPECTION_SCHEDULED'
    ) {
      await this.prisma.project.update({
        where: { id: project.id },
        data: { status: 'INSPECTION_SCHEDULED' as any },
      });

      if (project.user) {
        const projectUrl = `${this.emailService.getFrontendBaseUrl()}/dashboard/projects/${encodeURIComponent(
          project.id,
        )}`;

        await this.emailService.sendInspectionScheduledEmail({
          to: project.user.email,
          name: project.user.name ?? undefined,
          projectName: project.name,
          siteAddress: project.onboarding?.siteAddress ?? 'Not provided',
          scheduledFor,
          projectUrl,
        });
      }
    }

    await this.notifications.createAdminNotification({
      type: 'TRIP_SCHEDULED',
      title: 'Site visit scheduled',
      message: `A trip has been scheduled for project ${project.name} (${project.id}) on ${scheduledFor.toLocaleString()}.`,
      sendEmail: true,
    });

    return trip;
  }

  async listTrips(params?: { technicianId?: string; projectId?: string }) {
    const { technicianId, projectId } = params ?? {};

    const trips = await this.prisma.trip.findMany({
      where: {
        technicianId: technicianId ?? undefined,
        projectId: projectId ?? undefined,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: true,
        photos: true,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    return { items: trips };
  }

  async listTechnicians() {
    const technicians = await this.prisma.user.findMany({
      where: { role: UserRole.TECHNICIAN },
      select: {
        id: true,
        name: true,
        email: true,
        resetPasswordToken: true,
        resetPasswordExpires: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { items: technicians };
  }

  async inviteTechnician(payload: InviteTechnicianDto) {
    const email = payload.email.trim().toLowerCase();
    const name = payload.name?.trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    let user;

    if (!existing) {
      const temporaryPassword = crypto.randomBytes(12).toString('hex');
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: UserRole.TECHNICIAN,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          role: UserRole.TECHNICIAN,
          name: name ?? existing.name,
        },
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    await this.emailService.sendTechnicianInviteEmail({
      to: user.email,
      name: user.name,
      token,
    });

    return {
      message: 'Technician invite sent (if email is deliverable).',
    };
  }

  async revokeTechnicianInvite(payload: RevokeTechnicianDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return { message: 'Technician not found. No invite revoked.' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Technician invite revoked.' };
  }

  async checkIn(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.IN_PROGRESS,
        checkInAt: trip.checkInAt ?? new Date(),
      },
    });
  }

  async checkOut(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        checkOutAt: trip.checkOutAt ?? new Date(),
      },
    });

    // If this trip is linked to a milestone, make sure the milestone is
    // marked as completed as well. This is idempotent with the payment
    // verification flow which already completes the milestone when the
    // Paystack transaction succeeds.
    if (updated.milestoneId) {
      await this.milestones.updateStatus(
        updated.projectId,
        updated.milestoneId,
        MilestoneStatus.COMPLETED,
      );
    }

    return updated;
  }

  async rescheduleTrip(tripId: string, scheduledFor: Date) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        scheduledFor,
        status: TripStatus.SCHEDULED,
      },
    });
  }

  async reopenTrip(tripId: string, resetTasks: boolean, reason?: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        project: {
          include: {
            user: true,
          },
        },
      },
    } as any);
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.IN_PROGRESS,
        checkOutAt: null,
        reworkReason: reason?.trim() || null,
        reworkRequestedAt: new Date(),
      },
    });

    if (resetTasks) {
      await this.prisma.tripTask.updateMany({
        where: { tripId },
        data: { isDone: false },
      });
    }

    // Notify the project owner that this visit has been reopened for
    // follow-up work so they understand what is happening.
    const tripWithProject = trip as any;
    if (tripWithProject.project && tripWithProject.project.user) {
      const frontendBase = this.emailService.getFrontendBaseUrl();
      const operationsUrl = `${frontendBase}/dashboard/projects/${encodeURIComponent(
        tripWithProject.project.id,
      )}`;

      await this.emailService.sendReworkNotificationEmail({
        to: tripWithProject.project.user.email,
        name: tripWithProject.project.user.name,
        projectName: tripWithProject.project.name,
        visitWhen: updated.scheduledFor,
        reason: updated.reworkReason ?? reason ?? null,
        operationsUrl,
      });
    }

    await this.notifications.createAdminNotification({
      type: 'TRIP_REOPENED_REWORK',
      title: 'Trip reopened for rework',
      message: `Trip ${trip.id} for project ${trip.projectId} was reopened for rework. Reason: ${reason || 'N/A'}.`,
      sendEmail: true,
    });

    return updated;
  }

  async listTasks(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    const tasks = await this.prisma.tripTask.findMany({
      where: { tripId },
      orderBy: { sequence: 'asc' },
    });

    return { items: tasks };
  }

  async updateTaskStatus(
    tripId: string,
    taskId: string,
    isDone: boolean,
  ) {
    const task = await this.prisma.tripTask.findFirst({
      where: { id: taskId, tripId },
    });

    if (!task) {
      throw new NotFoundException('Task not found for this trip.');
    }

    return this.prisma.tripTask.update({
      where: { id: taskId },
      data: { isDone },
    });
  }

  async addPhoto(tripId: string, url: string, caption?: string | null) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    if (!url || !url.trim()) {
      throw new BadRequestException('Photo URL is required.');
    }

    return this.prisma.tripPhoto.create({
      data: {
        tripId,
        url: url.trim(),
        caption: caption?.trim() || null,
      },
    });
  }

  async getWorkProgress(projectId: string) {
    const shipment = await (this.prisma as any).projectDeviceShipment.findUnique(
      { where: { projectId } },
    );

    if (!shipment) {
      return {
        totalExpected: 0,
        totalInstalled: 0,
        categories: [] as Array<{
          key: string;
          label: string;
          expected: number;
          installed: number;
        }>,
      };
    }

    const items = Array.isArray(shipment.itemsJson)
      ? (shipment.itemsJson as any[])
      : [];

    const categoryLabels: Record<string, string> = {
      LIGHTING: 'Lighting Automation',
      CLIMATE: 'Climate Control',
      ACCESS: 'Access Control',
      SURVEILLANCE: 'Surveillance System',
      GATE: 'Gate Automation',
      STAIRCASE: 'Staircase & accent lighting',
    };

    const byCategory = new Map<
      string,
      { expected: number; installed: number }
    >();

    let totalExpected = 0;
    let totalInstalled = 0;

    for (const raw of items) {
      const category = (raw?.category as string | undefined) ?? 'UNKNOWN';
      const expected =
        typeof raw?.quantity === 'number' && raw.quantity > 0
          ? raw.quantity
          : 0;
      const installed =
        typeof raw?.installedQuantity === 'number' && raw.installedQuantity > 0
          ? Math.min(raw.installedQuantity, expected)
          : 0;

      if (expected <= 0) continue;

      const current = byCategory.get(category) ?? { expected: 0, installed: 0 };
      current.expected += expected;
      current.installed += installed;
      byCategory.set(category, current);

      totalExpected += expected;
      totalInstalled += installed;
    }

    const categories = Array.from(byCategory.entries()).map(
      ([key, value]) => ({
        key,
        label: categoryLabels[key] ?? key,
        expected: value.expected,
        installed: value.installed,
      }),
    );

    return {
      totalExpected,
      totalInstalled,
      categories,
    };
  }

  async updateWorkProgress(
    projectId: string,
    payload: { items: { quoteItemId: string; installed: number }[] },
  ) {
    if (!payload || !Array.isArray(payload.items) || !payload.items.length) {
      return this.getWorkProgress(projectId);
    }

    const shipment = await (this.prisma as any).projectDeviceShipment.findUnique(
      { where: { projectId } },
    );

    if (!shipment) {
      throw new NotFoundException(
        'Device shipment not found for this project.',
      );
    }

    const items = Array.isArray(shipment.itemsJson)
      ? (shipment.itemsJson as any[])
      : [];

    const updates = new Map<string, number>();

    for (const entry of payload.items) {
      if (!entry || typeof entry.quoteItemId !== 'string') continue;
      const target =
        typeof entry.installed === 'number' && entry.installed > 0
          ? entry.installed
          : 0;
      updates.set(entry.quoteItemId, target);
    }

    if (!updates.size) {
      return this.getWorkProgress(projectId);
    }

    const nextItems = items.map((raw: any) => {
      const quoteItemId = raw?.quoteItemId as string | undefined;
      if (!quoteItemId || !updates.has(quoteItemId)) {
        return raw;
      }

      const expected =
        typeof raw?.quantity === 'number' && raw.quantity > 0
          ? raw.quantity
          : 0;
      const requested = updates.get(quoteItemId) ?? 0;

      return {
        ...raw,
        installedQuantity:
          expected > 0 ? Math.max(0, Math.min(requested, expected)) : 0,
      };
    });

    await (this.prisma as any).projectDeviceShipment.update({
      where: { projectId },
      data: { itemsJson: nextItems },
    });

    return this.getWorkProgress(projectId);
  }

  async searchCustomers(query: string) {
    const q = query?.trim();
    if (!q) {
      return { items: [] };
    }

    const lowered = q.toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        email: {
          contains: lowered,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    return { items: users };
  }

  async createInspectionQuote(payload: {
    email: string;
    items: { productId: string; quantity: number }[];
    projectName?: string;
    buildingType?: string | null;
    roomsCount?: number | null;
  }) {
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Customer email is required.');
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new BadRequestException(
        'Please select at least one product for the inspection quote.',
      );
    }

    const baseItems = payload.items
      .map((item) => ({
        productId: item.productId,
        quantity:
          typeof item.quantity === 'number' && item.quantity > 0
            ? Math.floor(item.quantity)
            : 0,
      }))
      .filter((item) => item.productId && item.quantity > 0);

    if (!baseItems.length) {
      throw new BadRequestException(
        'All selected products have invalid quantities.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException(
        'No customer account found for this email. Please register the customer first.',
      );
    }

    const productIds = baseItems.map((i) => i.productId);

    const result = await this.prisma.$transaction(async (tx: any) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (!products.length) {
        throw new BadRequestException('No valid products found for quote.');
      }

      const byId = new Map<string, any>(
        products.map((p: any) => [p.id as string, p]),
      );

      const filteredItems = baseItems.filter((i) => byId.has(i.productId));
      if (!filteredItems.length) {
        throw new BadRequestException('No valid products found for quote.');
      }

      const now = new Date();
      const defaultProjectName = `Site inspection - ${now.toLocaleDateString(
        'en-NG',
      )}`;
      const name =
        payload.projectName?.trim().length ?? 0
          ? payload.projectName!.trim()
          : defaultProjectName;

      const project = await tx.project.create({
        data: {
          name,
          userId: user.id,
          status: 'QUOTES_GENERATED' as any,
          buildingType: payload.buildingType ?? null,
          roomsCount:
            typeof payload.roomsCount === 'number'
              ? payload.roomsCount
              : null,
        },
      });

      const quote = await tx.quote.create({
        data: {
          projectId: project.id,
          tier: PriceTier.STANDARD,
          status: 'GENERATED',
          currency: 'NGN',
          subtotal: 0,
          installationFee: 0,
          integrationFee: 0,
          logisticsCost: 0,
          miscellaneousFee: 0,
          taxAmount: 0,
          total: 0,
          isSelected: false,
          title: 'Inspection quote',
        },
      });

      let subtotal = 0;
      let totalDevices = 0;

      for (const item of filteredItems) {
        const product = byId.get(item.productId);
        const unitPrice = Number(product.unitPrice);
        const lineTotal = unitPrice * item.quantity;

        subtotal += lineTotal;
        totalDevices += item.quantity;

        await tx.quoteItem.create({
          data: {
            quoteId: quote.id,
            productId: product.id,
            name: product.name,
            category: product.category,
            quantity: item.quantity,
            unitPrice: product.unitPrice,
            totalPrice: lineTotal,
          },
        });
      }

      const config = await this.getQuoteFeeConfig();

      const fees = computeQuoteFees(
        subtotal,
        totalDevices,
        null,
        payload.roomsCount ?? null,
        config,
      );

      const updatedQuote = await tx.quote.update({
        where: { id: quote.id },
        data: {
          subtotal,
          installationFee: fees.installationFee,
          integrationFee: fees.integrationFee,
          logisticsCost: fees.logisticsCost,
          miscellaneousFee: fees.miscellaneousFee,
          taxAmount: fees.taxAmount,
          total: fees.total,
        },
        include: { items: true },
      });

      return { project, quote: updatedQuote };
    });

    const frontendBase = this.emailService.getFrontendBaseUrl();
    const quoteUrl = `${frontendBase}/dashboard/quotes/${encodeURIComponent(
      result.quote.id,
    )}`;

    await this.emailService.sendQuoteCreatedEmail({
      to: user.email,
      name: user.name,
      projectName: result.project.name,
      quoteUrl,
    });

    await this.notifications.createAdminNotification({
      type: 'INSPECTION_QUOTE_CREATED',
      title: 'Inspection quote created',
      message: `An inspection quote was created for project ${result.project.name} (${result.project.id}).`,
      sendEmail: true,
    });

    return {
      projectId: result.project.id,
      quoteId: result.quote.id,
    };
  }

  private async getQuoteFeeConfig(): Promise<QuoteFeeConfig | null> {
    const settings = await (this.prisma as any).pricingSettings.findFirst();
    if (!settings) return null;

    return {
      logisticsPerTripLagos: Number(settings.logisticsPerTripLagos),
      logisticsPerTripWestNear: Number(settings.logisticsPerTripWestNear),
      logisticsPerTripOther: Number(settings.logisticsPerTripOther),
      miscRate: Number(settings.miscRate),
      taxRate: Number(settings.taxRate),
    };
  }
}
