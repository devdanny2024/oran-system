/* Clear all project-related data for all users.
 *
 * This script deletes:
 * - Trip tasks + photos + trips
 * - Device shipments
 * - Project milestones
 * - Payment plans
 * - Project agreements
 * - Quote items + quotes
 * - Onboarding sessions
 * - Billing invoices linked to projects
 * - Projects
 *
 * Run from the backend directory with:
 *   node scripts/clear-projects.cjs
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[clear-projects] Starting project data wipe...');

  const projectCount = await prisma.project.count();
  console.log(`[clear-projects] Projects found: ${projectCount}`);

  if (projectCount === 0) {
    console.log('[clear-projects] No projects to delete. Exiting.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    console.log('[clear-projects] Deleting trip tasks...');
    await tx.tripTask.deleteMany({});

    console.log('[clear-projects] Deleting trip photos...');
    await tx.tripPhoto.deleteMany({});

    console.log('[clear-projects] Deleting trips...');
    await tx.trip.deleteMany({});

    console.log('[clear-projects] Deleting project device shipments...');
    await (tx).projectDeviceShipment.deleteMany({});

    console.log('[clear-projects] Deleting project milestones...');
    await tx.projectMilestone.deleteMany({});

    console.log('[clear-projects] Deleting payment plans...');
    await tx.paymentPlan.deleteMany({});

    console.log('[clear-projects] Deleting project agreements...');
    await tx.projectAgreement.deleteMany({});

    console.log('[clear-projects] Deleting quote items...');
    await tx.quoteItem.deleteMany({});

    console.log('[clear-projects] Deleting quotes...');
    await tx.quote.deleteMany({});

    console.log('[clear-projects] Deleting onboarding sessions...');
    await tx.onboardingSession.deleteMany({});

    console.log('[clear-projects] Deleting billing invoices linked to projects...');
    await (tx).billingInvoice.deleteMany({
      where: { projectId: { not: null } },
    });

    console.log('[clear-projects] Deleting projects...');
    await tx.project.deleteMany({});
  });

  console.log('[clear-projects] Project data wipe completed.');
}

main()
  .catch((error) => {
    console.error('[clear-projects] Error while clearing projects:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

