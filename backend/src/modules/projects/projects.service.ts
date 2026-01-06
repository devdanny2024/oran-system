import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly paystack: PaystackService,
    private readonly notifications: NotificationsService,
  ) {}

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

            const byId = new Map<string, any>(
              quoteItems.map((qi: any) => [qi.id as string, qi]),
            );

            items = rawItems.map((i: any) => {
              const qi = byId.get(i.quoteItemId as string) as any;
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

  async requestInspection(
    id: string,
    payload?: { siteAddress?: string; contactPhone?: string },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { onboarding: true, user: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const explicitAddress = payload?.siteAddress?.trim();
    const explicitPhone = payload?.contactPhone?.trim();

    const address = explicitAddress || project.onboarding?.siteAddress || '';
    const lowered = address.toLowerCase();

    const isLagos = lowered.includes('lagos');
    const isAbuja = lowered.includes('abuja');

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
      !isLagos &&
      !isAbuja &&
      westernStates.some((state) => lowered.includes(state));

    const fee =
      isLagos || isAbuja ? 15000 : isWesternNonLagos ? 30000 : 100000;

    // Ensure onboarding has the latest contact details.
    if (explicitAddress || explicitPhone) {
      if (project.onboarding) {
        await this.prisma.onboardingSession.update({
          where: { projectId: id },
          data: {
            siteAddress: explicitAddress || project.onboarding.siteAddress,
            contactPhone: explicitPhone || project.onboarding.contactPhone,
          },
        });
      } else {
        await this.prisma.onboardingSession.create({
          data: {
            projectId: id,
            siteAddress: explicitAddress ?? null,
            contactPhone: explicitPhone ?? null,
          },
        });
      }
    }

    // Prepare Paystack inspection fee payment.
    let authorizationUrl: string | null = null;

    try {
      const reference = `INSPECTION-${project.id}-${Date.now()}`;

      const callbackBase =
        process.env.PAYSTACK_CALLBACK_BASE_URL ||
        `${this.email.getFrontendBaseUrl()}/paystack/callback`;

      const callbackUrl = `${callbackBase}?type=inspection&projectId=${encodeURIComponent(
        project.id,
      )}`;

      const tx = await this.paystack.initializeTransaction({
        email: project.user.email,
        amountNaira: fee,
        reference,
        callbackUrl,
        metadata: {
          type: 'INSPECTION_FEE',
          projectId: project.id,
          region: isLagos
            ? 'LAGOS'
            : isAbuja
            ? 'ABUJA'
            : isWesternNonLagos
            ? 'WEST_NEAR'
            : 'OTHER',
        },
      });

      authorizationUrl = tx.authorization_url;
    } catch (error) {
      // Do not fail the request if payment initialization fails; admins
      // can still handle inspection manually.
      // eslint-disable-next-line no-console
      console.error('[ProjectsService] Failed to init inspection payment', error);
    }

    return {
      projectId: id,
      inspectionFee: fee,
      currency: 'NGN',
      inferredRegion: isLagos
        ? 'LAGOS'
        : isAbuja
        ? 'ABUJA'
        : isWesternNonLagos
        ? 'WEST_NEAR'
        : 'OTHER',
      siteAddress: address || null,
      authorizationUrl,
    };
  }

  async verifyInspectionPaystack(projectId: string, reference: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { onboarding: true, user: true },
    });

    if (!project || !project.user) {
      throw new BadRequestException(
        'Project or project owner not found for inspection payment.',
      );
    }

    const data = await this.paystack.verifyTransaction(reference);

    if (data.status !== 'success') {
      throw new BadRequestException(
        'Inspection payment was not successful. Please try again.',
      );
    }

    const metadata = (data.metadata ?? {}) as any;
    const metaType = metadata.type as string | undefined;
    const metaProjectId = metadata.projectId as string | undefined;

    if (metaType !== 'INSPECTION_FEE' || !metaProjectId) {
      throw new BadRequestException(
        'Payment metadata missing inspection information.',
      );
    }

    if (metaProjectId !== projectId) {
      throw new BadRequestException(
        'Inspection payment does not belong to this project.',
      );
    }

    // Mark project as having a requested inspection.
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'INSPECTION_REQUESTED' as any },
    });

    const address = project.onboarding?.siteAddress ?? 'Not provided';
    const phone = project.onboarding?.contactPhone ?? '';

    const feeNaira = data.amount / 100;

    // Record a simple billing invoice entry for this inspection payment.
    await (this.prisma as any).billingInvoice.create({
      data: {
        userId: project.userId,
        projectId: project.id,
        type: 'INSPECTION_FEE',
        description: 'Site inspection fee',
        amount: feeNaira,
        currency: data.currency ?? 'NGN',
        status: 'PAID',
        externalReference: data.reference ?? reference,
        paidAt: new Date(),
      },
    });

    // Notify admins via email now that payment is confirmed.
    const projectUrl = `${this.email.getFrontendBaseUrl()}/dashboard/projects/${encodeURIComponent(
      project.id,
    )}`;

    await this.email.sendInspectionRequestedEmail({
      projectName: project.name,
      customerName: project.user.name,
      customerEmail: project.user.email,
      siteAddress: address,
      contactPhone: phone,
      fee: feeNaira,
      region: (metadata.region as any) ?? 'OTHER',
      projectUrl,
    });

    // Notify the customer that their inspection payment has been received.
    await this.email.sendInspectionPaymentReceivedEmail({
      to: project.user.email,
      name: project.user.name,
      projectName: project.name,
      siteAddress: address,
      fee: feeNaira,
      projectUrl,
    });

    await this.notifications.createAdminNotification({
      type: 'INSPECTION_REQUESTED',
      title: 'Inspection fee paid and request logged',
      message: `Inspection fee paid for project ${project.name} (${project.id}).`,
      sendEmail: false,
    });

    return {
      projectId,
      amountPaid: feeNaira,
      currency: data.currency,
      status: data.status,
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

      // Delete trip tasks and photos before trips to satisfy FK constraints.
      const trips = await tx.trip.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const tripIds = trips.map((t) => t.id);

      if (tripIds.length > 0) {
        await tx.tripTask.deleteMany({
          where: { tripId: { in: tripIds } },
        });
        await tx.tripPhoto.deleteMany({
          where: { tripId: { in: tripIds } },
        });
        await tx.trip.deleteMany({
          where: { id: { in: tripIds } },
        });
      }

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

      await (tx as any).projectDeviceShipment.deleteMany({
        where: { projectId: id },
      });

      await tx.project.delete({
        where: { id },
      });
    });

    return { success: true };
  }
}
