import { Module } from '@nestjs/common';
import { ServiceFeesService } from './service-fees.service';
import { ServiceFeesController } from './service-fees.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Module({
  controllers: [ServiceFeesController],
  providers: [ServiceFeesService, PrismaService],
  exports: [ServiceFeesService],
})
export class ServiceFeesModule {}

