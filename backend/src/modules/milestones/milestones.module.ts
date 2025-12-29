import { Module } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [MilestonesService],
  controllers: [MilestonesController],
  exports: [MilestonesService],
})
export class MilestonesModule {}

