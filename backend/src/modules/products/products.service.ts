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
      orderBy: { createdAt: 'desc' },
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
}
