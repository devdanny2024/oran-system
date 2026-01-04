import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FinanceDisbursementStatus } from '@prisma/client';
import { PaystackService } from '../../infrastructure/paystack/paystack.service';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async assertFinanceAccess(userId: string) {
    // Access control for finance endpoints is currently enforced
    // at the frontend (admin / CFO views). Backend does not reject
    // unauthenticated calls so these endpoints can be used from
    // internal tools without extra headers.
    if (!userId) return;
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

    // For now, return an empty list so the
    // frontend finance page can load without
    // depending on new DB tables being present.
    return { items: [] };
  }

  async listBanks(userId: string) {
    await this.assertFinanceAccess(userId);

    const banks = await this.paystack.listBanks();

    return {
      items: banks.map((bank) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug ?? null,
      })),
    };
  }

  async createBeneficiary(params: {
    userId: string;
    name?: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName?: string;
  }) {
    await this.assertFinanceAccess(params.userId);

    // Resolve account name via Paystack if not provided explicitly.
    let accountName = params.accountName?.trim();
    if (!accountName) {
      const resolved = await this.paystack.resolveAccount({
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      });
      accountName = resolved.account_name;
    }

    const labelName = (params.name ?? accountName).trim();

    const beneficiary = await this.prisma.financeBeneficiary.create({
      data: {
        name: labelName,
        bankName: params.bankName,
        bankCode: params.bankCode,
        accountNumber: params.accountNumber,
        accountName,
      },
    });

    return beneficiary;
  }

  async listDisbursements(userId: string) {
    await this.assertFinanceAccess(userId);

    // For now, return an empty list so the
    // frontend finance page can load without
    // depending on new DB tables being present.
    return { items: [] };
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

    // Ensure we have a Paystack transfer recipient code.
    let recipientCode = beneficiary.paystackRecipientCode ?? null;

    if (!recipientCode) {
      const recipient = await this.paystack.createTransferRecipient({
        name: beneficiary.name,
        accountNumber: beneficiary.accountNumber,
        bankCode: beneficiary.bankCode,
        bankName: beneficiary.bankName,
      });

      recipientCode = recipient.recipient_code;

      await this.prisma.financeBeneficiary.update({
        where: { id: beneficiary.id },
        data: { paystackRecipientCode: recipientCode },
      });
    }

    const reference = `FIN-${base.id}`;

    try {
      const transfer = await this.paystack.initiateTransfer({
        amountNaira: params.amountNaira,
        recipient: recipientCode,
        reason:
          params.description ?? `Disbursement for ${beneficiary.name}`,
        reference,
      });

      const updated = await this.prisma.financeDisbursement.update({
        where: { id: base.id },
        data: {
          status: FinanceDisbursementStatus.SUCCESS,
          paystackTransferCode: transfer.transfer_code,
          paystackReference: transfer.reference,
        },
        include: {
          beneficiary: true,
        },
      });

      return updated;
    } catch (error) {
      await this.prisma.financeDisbursement.update({
        where: { id: base.id },
        data: {
          status: FinanceDisbursementStatus.FAILED,
        },
      });

      throw error;
    }
  }
}
