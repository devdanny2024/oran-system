'use strict';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling ProjectDeviceShipment for existing projects...');

  const projects = await prisma.project.findMany({
    include: { milestones: { orderBy: { index: 'asc' } } },
  });

  let createdCount = 0;

  for (const project of projects) {
    const existing = await prisma.projectDeviceShipment.findUnique({
      where: { projectId: project.id },
    });
    if (existing) continue;

    const firstMilestone = project.milestones[0];

    // If there is no milestone yet, still create an empty shipment
    // so the UI has something to show for older projects.
    if (!firstMilestone || !firstMilestone.itemsJson) {
      await prisma.projectDeviceShipment.create({
        data: {
          projectId: project.id,
          milestoneId: firstMilestone ? firstMilestone.id : null,
          itemsJson: [],
        },
      });
      createdCount++;
      continue;
    }

    let items = [];

    try {
      const rawItems = firstMilestone.itemsJson;
      const asArray = Array.isArray(rawItems) ? rawItems : [];

      const quoteItemIds = asArray
        .map((i) => i && i.quoteItemId)
        .filter((id) => typeof id === 'string');

      let byId = new Map();
      if (quoteItemIds.length > 0) {
        const quoteItems = await prisma.quoteItem.findMany({
          where: { id: { in: quoteItemIds } },
        });
        byId = new Map(quoteItems.map((qi) => [qi.id, qi]));
      }

      items = asArray.map((i) => {
        const qi = i && byId.get(i.quoteItemId);
        return {
          quoteItemId: i?.quoteItemId ?? null,
          quantity:
            i && typeof i.quantity === 'number' && i.quantity > 0
              ? i.quantity
              : 1,
          name: qi ? qi.name : null,
          category: qi ? qi.category : null,
        };
      });
    } catch (error) {
      console.error(
        'Failed to derive shipment items for project',
        project.id,
        error,
      );
      items = [];
    }

    await prisma.projectDeviceShipment.create({
      data: {
        projectId: project.id,
        milestoneId: firstMilestone.id,
        itemsJson: items,
      },
    });
    createdCount++;
  }

  console.log('Backfill complete. Shipments created:', createdCount);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

