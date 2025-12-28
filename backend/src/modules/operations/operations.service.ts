import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { InviteTechnicianDto } from './dto/invite-technician.dto';
import { TripStatus, UserRole } from '@prisma/client';
import { EmailService } from '../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

    return this.prisma.trip.create({
      data: {
        projectId: payload.projectId,
        technicianId: payload.technicianId,
        scheduledFor,
        notes: payload.notes,
      },
    });
  }

  async listTrips(params?: { technicianId?: string; projectId?: string }) {
    const { technicianId, projectId } = params ?? {};

    const trips = await this.prisma.trip.findMany({
      where: {
        technicianId: technicianId ?? undefined,
        projectId: projectId ?? undefined,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    return { items: trips };
  }

  async listTechnicians() {
    const technicians = await this.prisma.user.findMany({
      where: { role: UserRole.TECHNICIAN },
      select: { id: true, name: true, email: true },
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

    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        checkOutAt: trip.checkOutAt ?? new Date(),
      },
    });
  }
}
