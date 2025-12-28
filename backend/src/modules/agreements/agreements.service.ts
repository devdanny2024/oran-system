import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(projectId: string) {
    const agreements = await (this.prisma as any).projectAgreement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return { items: agreements };
  }

  async createForProjectIfMissing(projectId: string) {
    const existing = await (this.prisma as any).projectAgreement.findMany({
      where: { projectId },
    });

    if (existing.length) {
      return existing;
    }

    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { onboarding: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const customerName = project.userId
      ? undefined
      : undefined; // can be extended later when we join User

    const address = project.onboarding?.siteAddress ?? 'Not provided';

    const baseContext = `Project: ${project.name}\nAddress: ${address}\nRooms: ${
      project.roomsCount ?? 'N/A'
    }`;

    const maintenanceContent = [
      'Installation & Maintenance Agreement',
      '',
      baseContext,
      '',
      'This document describes the scope of installation, wiring, device mounting, configuration, testing, and ongoing maintenance support that ORAN will provide for this project.',
    ].join('\n');

    const scopeContent = [
      'Scope of Work & Product Schedule',
      '',
      baseContext,
      '',
      'This document summarizes the automation features and devices included in your chosen ORAN quote, and clarifies what is in scope vs out of scope.',
    ].join('\n');

    const paymentContent = [
      'Payment, Warranty & Cancellation Terms',
      '',
      baseContext,
      '',
      'This document explains how payments, warranty coverage, and cancellation or rescheduling work once this project is approved.',
    ].join('\n');

    const created = await this.prisma.$transaction((tx: any) =>
      Promise.all([
        tx.projectAgreement.create({
          data: {
            projectId,
            type: 'MAINTENANCE',
            title: 'Installation & Maintenance Agreement',
            content: maintenanceContent,
          },
        }),
        tx.projectAgreement.create({
          data: {
            projectId,
            type: 'SCOPE_OF_WORK',
            title: 'Scope of Work & Product Schedule',
            content: scopeContent,
          },
        }),
        tx.projectAgreement.create({
          data: {
            projectId,
            type: 'PAYMENT_TERMS',
            title: 'Payment, Warranty & Cancellation Terms',
            content: paymentContent,
          },
        }),
      ]),
    );

    return created;
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
