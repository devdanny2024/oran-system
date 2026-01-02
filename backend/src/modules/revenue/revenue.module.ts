import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [PrismaModule],
  providers: [RevenueService],
  controllers: [RevenueController],
})
export class RevenueModule {}

