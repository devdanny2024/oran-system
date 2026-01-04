import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PriceTier, ProductCategory, Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: payload.name,
        category: payload.category as ProductCategory,
        priceTier: payload.priceTier as PriceTier,
        unitPrice: new Prisma.Decimal(payload.unitPrice),
        description: payload.description,
      },
    });

    return product;
  }

  async list() {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return { items: products };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  async update(
    id: string,
    payload: {
      name?: string;
      unitPrice?: number;
      marketPrice?: number | null;
      ourPrice?: number | null;
      installTechnicianFee?: number | null;
      installClientFee?: number | null;
      integrationTechnicianFee?: number | null;
      integrationClientFee?: number | null;
      active?: boolean;
      description?: string | null;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const data: any = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) {
        throw new Error('Product name cannot be empty.');
      }
      data.name = name;
    }

    const numeric = (value: number | null | undefined) =>
      value === null || value === undefined ? null : new Prisma.Decimal(value);

    if (payload.unitPrice !== undefined) {
      data.unitPrice = new Prisma.Decimal(payload.unitPrice);
    }

    if (payload.marketPrice !== undefined) {
      data.marketPrice = numeric(payload.marketPrice);
    }

    if (payload.ourPrice !== undefined) {
      data.ourPrice = numeric(payload.ourPrice);
    }

    if (payload.installTechnicianFee !== undefined) {
      data.installTechnicianFee = numeric(payload.installTechnicianFee);
    }

    if (payload.installClientFee !== undefined) {
      data.installClientFee = numeric(payload.installClientFee);
    }

    if (payload.integrationTechnicianFee !== undefined) {
      data.integrationTechnicianFee = numeric(
        payload.integrationTechnicianFee,
      );
    }

    if (payload.integrationClientFee !== undefined) {
      data.integrationClientFee = numeric(payload.integrationClientFee);
    }

    if (payload.description !== undefined) {
      const description = payload.description?.trim();
      data.description = description && description.length ? description : null;
    }

    if (payload.active !== undefined) {
      data.active = Boolean(payload.active);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
    });

    return updated;
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    await this.prisma.product.update({
      where: { id },
      data: { active: false },
    });

    return { success: true };
  }
}
