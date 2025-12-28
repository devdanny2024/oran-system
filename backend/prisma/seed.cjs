/* Seed core automation products for ORAN.
 * These are example products with market price, our price, and image URLs
 * that the AI quote engine can use when generating proposals.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient, ProductCategory, PriceTier } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      name: 'Smart LED Downlight (12W)',
      category: ProductCategory.LIGHTING,
      priceTier: PriceTier.ECONOMY,
      marketPrice: '25000',
      ourPrice: '18000',
      unitPrice: '18000',
      imageUrl:
        'https://placehold.co/600x400?text=Smart+LED+Downlight',
      description:
        'Energy-efficient smart LED downlight with dimming and warm/cool white control, app and voice compatible.',
    },
    {
      name: 'Premium Smart Chandelier Controller',
      category: ProductCategory.LIGHTING,
      priceTier: PriceTier.LUXURY,
      marketPrice: '120000',
      ourPrice: '95000',
      unitPrice: '95000',
      imageUrl:
        'https://placehold.co/600x400?text=Smart+Chandelier+Controller',
      description:
        'Luxury smart controller for multi-arm chandeliers with scenes, scheduling, and remote access.',
    },
    {
      name: 'Wi‑Fi Touch Switch (3-Gang)',
      category: ProductCategory.LIGHTING,
      priceTier: PriceTier.STANDARD,
      marketPrice: '45000',
      ourPrice: '35000',
      unitPrice: '35000',
      imageUrl:
        'https://placehold.co/600x400?text=Wi-Fi+Touch+Switch',
      description:
        'Tempered-glass touch switch with three circuits, app control, and scene automation.',
    },
    {
      name: 'Smart Thermostat Controller',
      category: ProductCategory.CLIMATE,
      priceTier: PriceTier.STANDARD,
      marketPrice: '90000',
      ourPrice: '75000',
      unitPrice: '75000',
      imageUrl:
        'https://placehold.co/600x400?text=Smart+Thermostat',
      description:
        'Smart thermostat for AC units with scheduling, energy monitoring, and remote control.',
    },
    {
      name: 'Door/Window Contact Sensor (Pack of 2)',
      category: ProductCategory.ACCESS,
      priceTier: PriceTier.ECONOMY,
      marketPrice: '30000',
      ourPrice: '22000',
      unitPrice: '22000',
      imageUrl:
        'https://placehold.co/600x400?text=Contact+Sensor',
      description:
        'Wireless contact sensors for monitoring doors and windows, with instant phone alerts.',
    },
    {
      name: 'Smart Door Lock (Keypad + Fingerprint)',
      category: ProductCategory.ACCESS,
      priceTier: PriceTier.LUXURY,
      marketPrice: '250000',
      ourPrice: '210000',
      unitPrice: '210000',
      imageUrl:
        'https://placehold.co/600x400?text=Smart+Door+Lock',
      description:
        'High-security smart lock with fingerprint, PIN, key, and app access, suitable for main entrances.',
    },
    {
      name: 'Indoor Wi‑Fi Camera (1080p)',
      category: ProductCategory.SURVEILLANCE,
      priceTier: PriceTier.ECONOMY,
      marketPrice: '55000',
      ourPrice: '42000',
      unitPrice: '42000',
      imageUrl:
        'https://placehold.co/600x400?text=Indoor+Wi-Fi+Camera',
      description:
        'Compact indoor camera with 1080p video, night vision, and motion alerts.',
    },
    {
      name: 'Outdoor Bullet Camera (4MP, PoE)',
      category: ProductCategory.SURVEILLANCE,
      priceTier: PriceTier.STANDARD,
      marketPrice: '120000',
      ourPrice: '98000',
      unitPrice: '98000',
      imageUrl:
        'https://placehold.co/600x400?text=Outdoor+Bullet+Camera',
      description:
        'Weatherproof 4MP PoE camera with IR night vision and mobile viewing, ideal for perimeters.',
    },
    {
      name: 'Automatic Gate Motor Kit',
      category: ProductCategory.GATE,
      priceTier: PriceTier.STANDARD,
      marketPrice: '380000',
      ourPrice: '340000',
      unitPrice: '340000',
      imageUrl:
        'https://placehold.co/600x400?text=Gate+Motor+Kit',
      description:
        'Complete sliding/swing gate automation kit with remote controls and safety sensors.',
    },
    {
      name: 'Staircase Motion Lighting Kit',
      category: ProductCategory.STAIRCASE,
      priceTier: PriceTier.STANDARD,
      marketPrice: '160000',
      ourPrice: '135000',
      unitPrice: '135000',
      imageUrl:
        'https://placehold.co/600x400?text=Staircase+Lighting+Kit',
      description:
        'Step-by-step LED lighting kit with motion sensors for safe and dramatic stair illumination.',
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product,
      });
    } else {
      await prisma.product.create({ data: product });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${products.length} automation products.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Error while seeding products', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

