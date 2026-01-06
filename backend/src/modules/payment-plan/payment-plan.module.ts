import { Module } from '@nestjs/common';
import { PaymentPlanService } from './payment-plan.service';
import { PaymentPlanController } from './payment-plan.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, MilestonesModule, NotificationsModule],
  providers: [PaymentPlanService],
  controllers: [PaymentPlanController],
  exports: [PaymentPlanService],
})
export class PaymentPlanModule {}
