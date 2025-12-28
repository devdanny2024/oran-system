import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripStatus } from '@prisma/client';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

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

