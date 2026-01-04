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
    return this.finance.listBeneficiaries(req.user.id);
  }

  @Get('banks')
  async listBanks(@Req() req: any) {
    return this.finance.listBanks(req.user.id);
  }

  @Post('beneficiaries')
  async createBeneficiary(@Req() req: any, @Body() body: any) {
    const { name, bankName, bankCode, accountNumber, accountName } = body ?? {};

    return this.finance.createBeneficiary({
      userId: req.user.id,
      name,
      bankName,
      bankCode,
      accountNumber,
      accountName,
    });
  }

  @Get('disbursements')
  async listDisbursements(@Req() req: any) {
    return this.finance.listDisbursements(req.user.id);
  }

  @Post('disburse')
  async disburse(@Req() req: any, @Body() body: any) {
    const { beneficiaryId, amount, description } = body ?? {};

    return this.finance.createDisbursement({
      userId: req.user.id,
      beneficiaryId,
      amountNaira: Number(amount ?? 0),
      description,
    });
  }
}
