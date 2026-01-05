import {
  Body,
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('overview')
  async overview() {
    return this.finance.listOverview();
  }

  @Get('beneficiaries')
  async listBeneficiaries(@Req() req: any) {
    const userId = req.user?.id ?? null;
    return this.finance.listBeneficiaries(userId);
  }

  @Get('banks')
  async listBanks(@Req() req: any) {
    const userId = req.user?.id ?? null;
    return this.finance.listBanks(userId);
  }

  @Post('beneficiaries')
  async createBeneficiary(@Req() req: any, @Body() body: any) {
    const { name, bankName, bankCode, accountNumber, accountName } = body ?? {};

    const userId = req.user?.id ?? null;

    return this.finance.createBeneficiary({
      userId,
      name,
      bankName,
      bankCode,
      accountNumber,
      accountName,
    });
  }

  @Get('disbursements')
  async listDisbursements(@Req() req: any) {
    const userId = req.user?.id ?? null;
    return this.finance.listDisbursements(userId);
  }

  @Post('disburse')
  async disburse(@Req() req: any, @Body() body: any) {
    const { beneficiaryId, amount, description } = body ?? {};

    const userId = req.user?.id ?? null;

    return this.finance.createDisbursement({
      userId,
      beneficiaryId,
      amountNaira: Number(amount ?? 0),
      description,
    });
  }
}
