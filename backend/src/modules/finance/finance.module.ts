import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PaystackModule } from '../../infrastructure/paystack/paystack.module';

@Module({
  imports: [PrismaModule, PaystackModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}

