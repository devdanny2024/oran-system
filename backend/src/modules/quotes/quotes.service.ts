import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PriceTier, ProductCategory } from '@prisma/client';
import { AddQuoteItemDto } from './dto/add-quote-item.dto';
import { UpdateQuoteItemDto } from './dto/update-quote-item.dto';
import { AiService } from '../../infrastructure/ai/ai.service';

interface GeneratedQuoteItemInput {
  productId: string | null;
  name: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async listForProject(projectId: string) {
    const quotes = await (this.prisma as any).quote.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return { items: quotes };
  }

  async getById(id: string) {
    const quote = await (this.prisma as any).quote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async selectQuote(id: string) {
    const existing = await (this.prisma as any).quote.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Quote not found');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      await tx.quote.updateMany({
        where: { projectId: existing.projectId },
        data: { isSelected: false, status: 'GENERATED' },
      });

      const selected = await tx.quote.update({
        where: { id },
        data: { isSelected: true, status: 'SELECTED' },
        include: { items: true },
      });

      await tx.project.update({
        where: { id: existing.projectId },
        data: { status: 'QUOTE_SELECTED' },
      });

      return selected;
    });

    return updated;
  }

  async addItem(quoteId: string, dto: AddQuoteItemDto) {
    const quote = await (this.prisma as any).quote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      await tx.quoteItem.create({
        data: {
          quoteId,
          productId: product.id,
          name: product.name,
          category: product.category,
          quantity: dto.quantity,
          unitPrice: product.unitPrice,
          totalPrice: Number(product.unitPrice) * dto.quantity,
        },
      });

      return this.recalculateTotals(quoteId, tx);
    });

    return created;
  }

  async updateItem(quoteId: string, itemId: string, dto: UpdateQuoteItemDto) {
    const quote = await (this.prisma as any).quote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.quoteItem.findUnique({
        where: { id: itemId },
      });

      if (!item || item.quoteId !== quoteId) {
        throw new NotFoundException('Quote item not found');
      }

      const quantity =
        typeof dto.quantity === 'number' && dto.quantity > 0
          ? dto.quantity
          : item.quantity;

      await tx.quoteItem.update({
        where: { id: itemId },
        data: {
          quantity,
          totalPrice: Number(item.unitPrice) * quantity,
        },
      });

      return this.recalculateTotals(quoteId, tx);
    });

    return updated;
  }

  async removeItem(quoteId: string, itemId: string) {
    const quote = await (this.prisma as any).quote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.quoteItem.findUnique({
        where: { id: itemId },
      });

      if (!item || item.quoteId !== quoteId) {
        throw new NotFoundException('Quote item not found');
      }

      await tx.quoteItem.delete({
        where: { id: itemId },
      });

      return this.recalculateTotals(quoteId, tx);
    });

    return updated;
  }

  private async recalculateTotals(quoteId: string, tx?: any) {
    const client: any = tx ?? this.prisma;

    const quoteWithItems = await client.quote.findUnique({
      where: { id: quoteId },
      include: { items: true },
    });

    if (!quoteWithItems) {
      throw new NotFoundException('Quote not found');
    }

    const subtotal = quoteWithItems.items.reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice),
      0,
    );

    const updated = await client.quote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        total: subtotal,
      },
      include: { items: true },
    });

    return updated;
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

    // Prefer Gemini-generated plan when available.
    const aiPlan = await this.ai.generateQuotePlan({
      project: {
        roomsCount: project.roomsCount,
        buildingType: project.buildingType,
      },
      onboarding: project.onboarding
        ? {
            projectStatus: project.onboarding.projectStatus,
            constructionStage: project.onboarding.constructionStage,
            needsInspection: project.onboarding.needsInspection,
            selectedFeatures: Array.isArray(project.onboarding.selectedFeatures)
              ? (project.onboarding.selectedFeatures as string[])
              : null,
            stairSteps: project.onboarding.stairSteps,
          }
        : null,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        priceTier: p.priceTier,
      })),
    });

    const rooms =
      project.roomsCount && project.roomsCount > 0 ? project.roomsCount : 1;

    const selectedFeatures =
      (project.onboarding?.selectedFeatures as string[] | undefined)?.map((f) =>
        String(f).toLowerCase(),
      ) ?? [];

    const stairSteps = project.onboarding?.stairSteps ?? null;

    let economyItems: GeneratedQuoteItemInput[];
    let standardItems: GeneratedQuoteItemInput[];
    let luxuryItems: GeneratedQuoteItemInput[];

    if (aiPlan) {
      economyItems = this.mapAiItemsToGenerated(
        products,
        aiPlan.economy,
        rooms,
        selectedFeatures,
        stairSteps,
        PriceTier.ECONOMY,
      );

      standardItems = this.mapAiItemsToGenerated(
        products,
        aiPlan.standard,
        rooms,
        selectedFeatures,
        stairSteps,
        PriceTier.STANDARD,
      );

      luxuryItems = this.mapAiItemsToGenerated(
        products,
        aiPlan.luxury,
        rooms,
        selectedFeatures,
        stairSteps,
        PriceTier.LUXURY,
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        '[QuotesService] Gemini quote plan missing; falling back to deterministic generator.',
      );

      economyItems = this.buildTierItems(
        products,
        PriceTier.ECONOMY,
        rooms,
        selectedFeatures,
        stairSteps,
      );

      standardItems = this.buildTierItems(
        products,
        PriceTier.STANDARD,
        rooms,
        selectedFeatures,
        stairSteps,
      );

      luxuryItems = this.buildTierItems(
        products,
        PriceTier.LUXURY,
        rooms,
        selectedFeatures,
        stairSteps,
      );
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      // Optional: clear old GENERATED quotes so the list stays tidy
      await tx.quote.deleteMany({
        where: { projectId, status: 'GENERATED' },
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
            status: 'GENERATED',
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
    selectedFeatures: string[],
    stairSteps: number | null,
  ): GeneratedQuoteItemInput[] {
    const tierProducts = products.filter((p) => p.priceTier === tier);

    const items: GeneratedQuoteItemInput[] = [];

    const featureSet = new Set(selectedFeatures);

    const featureToCategory: Record<string, ProductCategory> = {
      lighting: ProductCategory.LIGHTING,
      climate: ProductCategory.CLIMATE,
      surveillance: ProductCategory.SURVEILLANCE,
      access: ProductCategory.ACCESS,
      gate: ProductCategory.GATE,
      staircase: ProductCategory.STAIRCASE,
    };

    const allowedCategories = new Set<ProductCategory>();

    if (featureSet.size === 0) {
      // If no features captured, allow all categories.
      Object.values(ProductCategory).forEach((cat) =>
        allowedCategories.add(cat),
      );
    } else {
      for (const feature of featureSet) {
        const mapped = featureToCategory[feature];
        if (mapped) {
          allowedCategories.add(mapped);
        }
      }
    }

    // Pick one product per allowed category for this tier.
    const byCategory: Partial<
      Record<
        ProductCategory,
        { id: string; name: string; category: ProductCategory; unitPrice: any }
      >
    > = {};
    for (const p of tierProducts) {
      if (!allowedCategories.has(p.category)) continue;
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

      let quantity = 0;

      if (category === ProductCategory.LIGHTING) {
        if (tier === PriceTier.ECONOMY) {
          quantity = Math.max(rooms * 1, 2);
        } else if (tier === PriceTier.STANDARD) {
          quantity = Math.max(rooms * 2, 4);
        } else {
          quantity = Math.max(rooms * 3, 6);
        }
      } else if (category === ProductCategory.CLIMATE) {
        if (tier === PriceTier.ECONOMY) {
          quantity = Math.max(Math.ceil(rooms / 2), 1);
        } else {
          quantity = Math.max(rooms, 1);
        }
      } else if (category === ProductCategory.SURVEILLANCE) {
        if (tier === PriceTier.ECONOMY) {
          quantity = Math.max(Math.ceil(rooms / 3), 1);
        } else if (tier === PriceTier.STANDARD) {
          quantity = Math.max(Math.ceil(rooms / 2), 2);
        } else {
          quantity = Math.max(rooms, 3);
        }
      } else if (category === ProductCategory.ACCESS) {
        if (tier === PriceTier.ECONOMY) {
          quantity = 1;
        } else if (tier === PriceTier.STANDARD) {
          quantity = 2;
        } else {
          quantity = 3;
        }
      } else if (category === ProductCategory.GATE) {
        quantity = 1;
      } else if (category === ProductCategory.STAIRCASE) {
        if (stairSteps && stairSteps > 0) {
          quantity = 1;
        }
      }

      if (quantity <= 0) continue;

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

  private mapAiItemsToGenerated(
    products: Array<{
      id: string;
      name: string;
      category: ProductCategory;
      priceTier: PriceTier;
      unitPrice: any;
    }>,
    aiItems: { productId: string; quantity: number }[],
    rooms: number,
    selectedFeatures: string[],
    stairSteps: number | null,
    tier: PriceTier,
  ): GeneratedQuoteItemInput[] {
    const items: GeneratedQuoteItemInput[] = [];

    const featureSet = new Set(selectedFeatures);

    const featureToCategory: Record<string, ProductCategory> = {
      lighting: ProductCategory.LIGHTING,
      climate: ProductCategory.CLIMATE,
      surveillance: ProductCategory.SURVEILLANCE,
      access: ProductCategory.ACCESS,
      gate: ProductCategory.GATE,
      staircase: ProductCategory.STAIRCASE,
    };

    const allowedCategories = new Set<ProductCategory>();

    if (featureSet.size === 0) {
      Object.values(ProductCategory).forEach((cat) =>
        allowedCategories.add(cat),
      );
    } else {
      for (const feature of featureSet) {
        const mapped = featureToCategory[feature];
        if (mapped) {
          allowedCategories.add(mapped);
        }
      }
    }

    for (const aiItem of aiItems) {
      const product = products.find((p) => p.id === aiItem.productId);
      if (!product) continue;
      if (!allowedCategories.has(product.category)) continue;

      let quantity = aiItem.quantity > 0 ? aiItem.quantity : 1;

      // Guardrails: enforce rough scaling by category+tier even if Gemini gives odd numbers.
      if (product.category === ProductCategory.LIGHTING) {
        const min =
          tier === PriceTier.ECONOMY
            ? Math.max(rooms * 1, 2)
            : tier === PriceTier.STANDARD
              ? Math.max(rooms * 2, 4)
              : Math.max(rooms * 3, 6);
        if (quantity < min) quantity = min;
      } else if (product.category === ProductCategory.SURVEILLANCE) {
        const min =
          tier === PriceTier.ECONOMY
            ? Math.max(Math.ceil(rooms / 3), 1)
            : tier === PriceTier.STANDARD
              ? Math.max(Math.ceil(rooms / 2), 2)
              : Math.max(rooms, 3);
        if (quantity < min) quantity = min;
      } else if (product.category === ProductCategory.CLIMATE) {
        const min =
          tier === PriceTier.ECONOMY
            ? Math.max(Math.ceil(rooms / 2), 1)
            : Math.max(rooms, 1);
        if (quantity < min) quantity = min;
      } else if (product.category === ProductCategory.ACCESS) {
        const min =
          tier === PriceTier.ECONOMY
            ? 1
            : tier === PriceTier.STANDARD
              ? 2
              : 3;
        if (quantity < min) quantity = min;
      } else if (product.category === ProductCategory.GATE) {
        if (quantity < 1) quantity = 1;
      } else if (product.category === ProductCategory.STAIRCASE) {
        if (!stairSteps || stairSteps <= 0) continue;
        if (quantity < 1) quantity = 1;
      }

      items.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        quantity,
        unitPrice: Number(product.unitPrice),
      });
    }

    return items;
  }
}
