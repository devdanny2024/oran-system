import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  FinanceDisbursementStatus,
  UserRole,
} from '@prisma/client';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async assertFinanceAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.CFO)) {
      throw new ForbiddenException('You do not have access to finance tools.');
    }
  }

  async listOverview() {
    // Reuse revenue overview for profit breakdown
    const revenue = await (this.prisma as any).$transaction(async (tx: any) => {
      const revenueModule = (await import('../revenue/revenue.service')).RevenueService;
      const service = new revenueModule(tx);
      return service.overview();
    });

    return revenue;
  }

  async listBeneficiaries(userId: string) {
    await this.assertFinanceAccess(userId);

    const items = await this.prisma.financeBeneficiary.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { items };
  }

  async createBeneficiary(params: {
    userId: string;
    name: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  }) {
    await this.assertFinanceAccess(params.userId);

    const beneficiary = await this.prisma.financeBeneficiary.create({
      data: {
        name: params.name,
        bankName: params.bankName,
        bankCode: params.bankCode,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
      },
    });

    return beneficiary;
  }

  async listDisbursements(userId: string) {
    await this.assertFinanceAccess(userId);

    const items = await this.prisma.financeDisbursement.findMany({
      include: {
        beneficiary: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { items };
  }

  async createDisbursement(params: {
    userId: string;
    beneficiaryId: string;
    amountNaira: number;
    description?: string;
  }) {
    await this.assertFinanceAccess(params.userId);

    if (!params.amountNaira || params.amountNaira <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    const beneficiary = await this.prisma.financeBeneficiary.findUnique({
      where: { id: params.beneficiaryId },
    });

    if (!beneficiary) {
      throw new BadRequestException('Beneficiary not found.');
    }

    const MAX_AUTO_DISBURSE = 200_000;

    const base = await this.prisma.financeDisbursement.create({
      data: {
        beneficiaryId: beneficiary.id,
        amount: params.amountNaira,
        currency: 'NGN',
        description: params.description ?? null,
        status:
          params.amountNaira > MAX_AUTO_DISBURSE
            ? FinanceDisbursementStatus.PENDING_ADMIN_APPROVAL
            : FinanceDisbursementStatus.PENDING,
        createdByUserId: params.userId,
      },
    });

    if (params.amountNaira > MAX_AUTO_DISBURSE) {
      // Do not call Paystack; leave for admin to handle manually.
      return base;
    }

    // For now, rely on manual Paystack dashboard transfers.
    // This placeholder can be extended later to call Paystack transfers.
    return base;
  }
}

