import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ServiceFeeType } from '@prisma/client';

@Injectable()
export class ServiceFeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const fees = await this.prisma.serviceFee.findMany({
      orderBy: { name: 'asc' },
    });

    return { items: fees };
  }

  async create(payload: {
    name: string;
    type: ServiceFeeType;
    technicianAmount: number;
    clientAmount: number;
  }) {
    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Name is required for a service fee.');
    }

    const technicianAmount = Number(payload.technicianAmount ?? 0);
    const clientAmount = Number(payload.clientAmount ?? 0);

    if (technicianAmount < 0 || clientAmount < 0) {
      throw new BadRequestException('Amounts must be zero or positive.');
    }

    const fee = await this.prisma.serviceFee.create({
      data: {
        name,
        type: payload.type,
        technicianAmount,
        clientAmount,
      },
    });

    return fee;
  }

  async update(
    id: string,
    payload: {
      name?: string;
      type?: ServiceFeeType;
      technicianAmount?: number;
      clientAmount?: number;
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.serviceFee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Service fee not found.');
    }

    const data: any = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) {
        throw new BadRequestException('Name cannot be empty.');
      }
      data.name = name;
    }

    if (payload.type !== undefined) {
      data.type = payload.type;
    }

    if (payload.technicianAmount !== undefined) {
      const value = Number(payload.technicianAmount);
      if (value < 0) {
        throw new BadRequestException('Technician amount must be >= 0.');
      }
      data.technicianAmount = value;
    }

    if (payload.clientAmount !== undefined) {
      const value = Number(payload.clientAmount);
      if (value < 0) {
        throw new BadRequestException('Client amount must be >= 0.');
      }
      data.clientAmount = value;
    }

    if (payload.active !== undefined) {
      data.active = Boolean(payload.active);
    }

    const updated = await this.prisma.serviceFee.update({
      where: { id },
      data,
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.serviceFee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Service fee not found.');
    }

    await this.prisma.serviceFee.delete({
      where: { id },
    });

    return { success: true };
  }
}

