import { Module } from '@nestjs/common';
import { PaymentPlanService } from './payment-plan.service';
import { PaymentPlanController } from './payment-plan.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PaymentPlanService],
  controllers: [PaymentPlanController],
  exports: [PaymentPlanService],
})
export class PaymentPlanModule {}

