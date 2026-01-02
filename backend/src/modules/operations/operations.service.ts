import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { InviteTechnicianDto } from './dto/invite-technician.dto';
import { RevokeTechnicianDto } from './dto/revoke-technician.dto';
import { TripStatus, UserRole, MilestoneStatus } from '@prisma/client';
import { EmailService } from '../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { MilestonesService } from '../milestones/milestones.service';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly milestones: MilestonesService,
  ) {}

  async createTrip(payload: CreateTripDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: payload.projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found for trip.');
    }

    if (payload.technicianId) {
      const technician = await this.prisma.user.findUnique({
        where: { id: payload.technicianId },
      });

      if (!technician || technician.role !== 'TECHNICIAN') {
        throw new BadRequestException('Technician user not found.');
      }
    }

    const scheduledFor = new Date(payload.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('Invalid scheduled date.');
    }

    const trip = await this.prisma.trip.create({
      data: {
        projectId: payload.projectId,
        technicianId: payload.technicianId,
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
    if (trip.project && trip.project.user) {
      const frontendBase = this.emailService.getFrontendBaseUrl();
      const operationsUrl = `${frontendBase}/dashboard/projects/${encodeURIComponent(
        trip.project.id,
      )}`;

      await this.emailService.sendReworkNotificationEmail({
        to: trip.project.user.email,
        name: trip.project.user.name,
        projectName: trip.project.name,
        visitWhen: updated.scheduledFor,
        reason: updated.reworkReason ?? reason ?? null,
        operationsUrl,
      });
    }

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
}
