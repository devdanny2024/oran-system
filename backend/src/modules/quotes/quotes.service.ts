import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PriceTier, ProductCategory, QuoteStatus } from '@prisma/client';

interface GeneratedQuoteItemInput {
  productId: string | null;
  name: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(projectId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return { items: quotes };
  }

  async getById(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  /**
   * Initial deterministic quote generator using seeded products.
   * This is structured so we can later delegate selection
   * and pricing decisions to Gemini using GEMINI_API_KEY.
   */
  async generateForProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { onboarding: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const products = await this.prisma.product.findMany({
      where: { active: true },
    });

    if (!products.length) {
      throw new NotFoundException(
        'No automation products are configured yet.',
      );
    }

    // Very simple heuristic: scale quantities by roomsCount (minimum 1)
    const rooms = project.roomsCount && project.roomsCount > 0 ? project.roomsCount : 1;

    const economyItems = this.buildTierItems(products, PriceTier.ECONOMY, rooms);
    const standardItems = this.buildTierItems(products, PriceTier.STANDARD, rooms);
    const luxuryItems = this.buildTierItems(products, PriceTier.LUXURY, rooms);

    const created = await this.prisma.$transaction(async (tx) => {
      // Optional: clear old GENERATED quotes so the list stays tidy
      await tx.quote.deleteMany({
        where: { projectId, status: QuoteStatus.GENERATED },
      });

      const createdQuotes = [];

      for (const [tier, items] of [
        [PriceTier.ECONOMY, economyItems] as const,
        [PriceTier.STANDARD, standardItems] as const,
        [PriceTier.LUXURY, luxuryItems] as const,
      ]) {
        const subtotal = items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );

        const quote = await tx.quote.create({
          data: {
            projectId,
            tier,
            status: QuoteStatus.GENERATED,
            title:
              tier === PriceTier.ECONOMY
                ? 'Economy automation package'
                : tier === PriceTier.STANDARD
                  ? 'Standard automation package'
                  : 'Luxury automation package',
            subtotal,
            total: subtotal,
            currency: 'NGN',
            items: {
              create: items.map((item) => ({
                productId: item.productId ?? undefined,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.unitPrice * item.quantity,
              })),
            },
          },
          include: { items: true },
        });

        createdQuotes.push(quote);
      }

      return createdQuotes;
    });

    // Mark project status
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'QUOTES_GENERATED',
      },
    });

    return { items: created };
  }

  private buildTierItems(
    products: Array<{
      id: string;
      name: string;
      category: ProductCategory;
      priceTier: PriceTier;
      unitPrice: any;
    }>,
    tier: PriceTier,
    rooms: number,
  ): GeneratedQuoteItemInput[] {
    const tierProducts = products.filter((p) => p.priceTier === tier);

    const items: GeneratedQuoteItemInput[] = [];

    // Very simple mapping: pick one product per category where available
    const byCategory: Partial<Record<ProductCategory, { id: string; name: string; category: ProductCategory; unitPrice: any }>> =
      {};
    for (const p of tierProducts) {
      if (!byCategory[p.category]) {
        byCategory[p.category] = {
          id: p.id,
          name: p.name,
          category: p.category,
          unitPrice: p.unitPrice,
        };
      }
    }

    for (const category of Object.keys(byCategory) as ProductCategory[]) {
      const base = byCategory[category]!;

      let quantity = 1;
      if (category === ProductCategory.LIGHTING) {
        quantity = Math.max(rooms * 2, 2);
      } else if (category === ProductCategory.SURVEILLANCE) {
        quantity = Math.max(Math.ceil(rooms / 2), 1);
      } else if (category === ProductCategory.ACCESS) {
        quantity = 1;
      } else if (category === ProductCategory.GATE) {
        quantity = 1;
      } else if (category === ProductCategory.STAIRCASE) {
        quantity = 1;
      } else if (category === ProductCategory.CLIMATE) {
        quantity = Math.max(rooms, 1);
      }

      items.push({
        productId: base.id,
        name: base.name,
        category: base.category,
        quantity,
        unitPrice: Number(base.unitPrice),
      });
    }

    return items;
  }
}

