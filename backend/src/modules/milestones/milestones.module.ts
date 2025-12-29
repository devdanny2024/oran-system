import { Module } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { PaystackModule } from '../../infrastructure/paystack/paystack.module';

@Module({
  imports: [PrismaModule, AiModule, PaystackModule],
  providers: [MilestonesService],
  controllers: [MilestonesController],
  exports: [MilestonesService],
})
export class MilestonesModule {}
