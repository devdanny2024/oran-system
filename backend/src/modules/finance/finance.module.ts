import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PaystackModule } from '../../infrastructure/paystack/paystack.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, PaystackModule, NotificationsModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
