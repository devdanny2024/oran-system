import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(projectId: string) {
    let agreements = await (this.prisma as any).projectAgreement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // If no agreements exist yet but the project has progressed to the
    // documents/payment stages, lazily create them so the customer can sign.
    if (!agreements.length) {
      const project = await (this.prisma as any).project.findUnique({
        where: { id: projectId },
        select: { status: true },
      });
      if (
        project &&
        (project.status === ProjectStatus.DOCUMENTS_PENDING ||
          project.status === ProjectStatus.DOCUMENTS_SIGNED ||
          project.status === ProjectStatus.PAYMENT_PLAN_SELECTED)
      ) {
        agreements = await this.createForProjectIfMissing(projectId);
      }
    }

    return { items: agreements };
  }

  async createForProjectIfMissing(projectId: string) {
    const existing = await (this.prisma as any).projectAgreement.findMany({
      where: { projectId },
    });

    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { onboarding: true, user: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const customerName =
      project.user?.name && project.user.name.trim().length > 0
        ? project.user.name
        : project.user?.email ?? 'Customer';

    const address = project.onboarding?.siteAddress ?? 'Not provided';

    const baseContext = `Customer: ${customerName}\nProject: ${project.name}\nAddress: ${address}\nRooms: ${project.roomsCount ?? 'N/A'}`;

    const maintenanceContent = [
      'Installation & Maintenance Agreement',
      '',
      baseContext,
      '',
      '1. Scope of installation',
      'ORAN will provide design review, low‑voltage wiring guidance, device mounting, configuration, testing and handover of the agreed smart home automation system for this project.',
      'Installation covers only the devices and services listed in the approved ORAN quote and any written variations agreed later.',
      '',
      '2. Responsibilities on site',
      'The customer is responsible for providing safe access to the site, a clean working environment, stable power, internet connectivity and any required builder or landlord permissions.',
      'ORAN technicians will follow reasonable site rules and will take care to avoid damage to finished surfaces. Any pre‑existing issues or third‑party works remain the responsibility of the customer and/or their contractors.',
      '',
      '3. Variations and additional work',
      'If the customer requests changes after work has begun (extra rooms, devices, or re‑routing of cabling), ORAN will document the variation and associated cost before proceeding.',
      'Variation amounts may be invoiced separately or added to the remaining project milestones.',
      '',
      '4. Maintenance and support',
      'After handover, ORAN will provide remote support for configuration issues and minor adjustments within the first 30 days at no additional charge.',
      'Ongoing maintenance or site visits beyond this window may be billed according to ORAN’s current maintenance rates unless covered by a separate maintenance plan.',
      '',
      '5. Access to equipment and software',
      'ORAN may temporarily access controllers, apps and cloud services to commission and support the system.',
      'Administrative logins, configuration files and documentation will be handed over on completion, except for any proprietary tools ORAN uses internally.',
    ].join('\n');

    const scopeContent = [
      'Scope of Work & Product Schedule',
      '',
      baseContext,
      '',
      '1. Included systems',
      'The project includes only the automation categories, devices and quantities listed in your approved ORAN quote and confirmed during onboarding.',
      'Examples may include lighting control, climate control, access control, surveillance, gate automation and staircase lighting.',
      '',
      '2. Product schedule',
      'The detailed bill of materials (devices, quantities and unit prices) is contained in your selected quote and any agreed variations.',
      'If a specified product becomes unavailable, ORAN may substitute an equivalent or better model after discussing the change with the customer. Any material differences in functionality or price will be agreed in writing.',
      '',
      '3. Exclusions',
      'Civil works, major electrical distribution changes, painting, carpentry, false ceilings and network cabling beyond what is specified in the quote are excluded unless explicitly listed as line items.',
      'Third‑party services such as internet service, security monitoring or streaming subscriptions are not part of this agreement.',
      '',
      '4. Handover',
      'On completion, ORAN will walk the customer through the system, demonstrate key use cases, and provide basic training on apps, scenes and schedules.',
      'Any punch‑list items identified during handover will be documented and scheduled for resolution within a reasonable timeframe.',
    ].join('\n');

    const paymentContent = [
      'Payment, Warranty & Cancellation Terms',
      '',
      baseContext,
      '',
      '1. Payment structure',
      'Payments for this project will follow the payment style selected inside the ORAN dashboard (for example, 3 milestones or an 80 / 10 / 10 plan).',
      'Invoices will be issued for each milestone and are due upon receipt unless otherwise stated. Work may pause if invoices remain unpaid beyond the agreed terms.',
      '',
      '2. Warranty',
      'ORAN will honour manufacturer warranties on supplied hardware and will provide a workmanship warranty on installation for a period communicated in your quote or onboarding summary.',
      'Warranty does not cover misuse, unauthorised modifications, damage caused by other contractors, power issues, lightning, or network/internet outages.',
      '',
      '3. Cancellation and rescheduling',
      'If the customer cancels the project after equipment has been ordered, ORAN may charge for restocking fees or any non‑returnable items already supplied.',
      'Site visits that are cancelled or rescheduled with less than 24 hours notice may incur a call‑out fee to cover technician time and logistics.',
      '',
      '4. Logistics and travel',
      'Where the project site is outside Lagos, additional logistics and travel costs may apply, as reflected in your quote. These cover round‑trip transport for technicians and essential equipment.',
      '',
      '5. Governing law',
      'This agreement is governed by the laws of the Federal Republic of Nigeria. Any disputes will be handled in good faith, with both parties first attempting to resolve issues informally before escalating further.',
    ].join('\n');

    const upserted = await this.prisma.$transaction(async (tx: any) => {
      const byType: Record<string, any | undefined> = {};
      for (const agreement of existing) {
        byType[agreement.type] = agreement;
      }

      const results = await Promise.all([
        byType.MAINTENANCE
          ? tx.projectAgreement.update({
              where: { id: byType.MAINTENANCE.id },
              data: {
                title: 'Installation & Maintenance Agreement',
                content: maintenanceContent,
              },
            })
          : tx.projectAgreement.create({
              data: {
                projectId,
                type: 'MAINTENANCE',
                title: 'Installation & Maintenance Agreement',
                content: maintenanceContent,
              },
            }),
        byType.SCOPE_OF_WORK
          ? tx.projectAgreement.update({
              where: { id: byType.SCOPE_OF_WORK.id },
              data: {
                title: 'Scope of Work & Product Schedule',
                content: scopeContent,
              },
            })
          : tx.projectAgreement.create({
              data: {
                projectId,
                type: 'SCOPE_OF_WORK',
                title: 'Scope of Work & Product Schedule',
                content: scopeContent,
              },
            }),
        byType.PAYMENT_TERMS
          ? tx.projectAgreement.update({
              where: { id: byType.PAYMENT_TERMS.id },
              data: {
                title: 'Payment, Warranty & Cancellation Terms',
                content: paymentContent,
              },
            })
          : tx.projectAgreement.create({
              data: {
                projectId,
                type: 'PAYMENT_TERMS',
                title: 'Payment, Warranty & Cancellation Terms',
                content: paymentContent,
              },
            }),
      ]);

      return results;
    });

    return upserted;
  }

  async acceptAgreement(params: {
    projectId: string;
    agreementId: string;
    userId: string;
    userAgent?: string | null;
  }) {
    const agreement = await (this.prisma as any).projectAgreement.findFirst({
      where: { id: params.agreementId, projectId: params.projectId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const acceptedAt = new Date();

    const signaturePayload = [
      params.userId,
      params.projectId,
      params.agreementId,
      acceptedAt.toISOString(),
      params.userAgent ?? '',
    ].join('|');

    const hash = crypto
      .createHash('sha256')
      .update(signaturePayload)
      .digest('hex');

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const saved = await tx.projectAgreement.update({
        where: { id: params.agreementId },
        data: {
          acceptedAt,
          acceptedByUserId: params.userId,
          acceptedDeviceSignature: hash,
        },
      });

      const remaining = await tx.projectAgreement.count({
        where: {
          projectId: params.projectId,
          acceptedAt: null,
        },
      });

      if (remaining === 0) {
        await tx.project.update({
          where: { id: params.projectId },
          data: { status: ProjectStatus.DOCUMENTS_SIGNED },
        });
      }

      return saved;
    });

    return updated;
  }
}
