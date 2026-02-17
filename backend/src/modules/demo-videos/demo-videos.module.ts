import { Module } from '@nestjs/common';
import { DemoVideosController } from './demo-videos.controller';
import { DemoVideosService } from './demo-videos.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Module({
  controllers: [DemoVideosController],
  providers: [DemoVideosService, PrismaService],
})
export class DemoVideosModule {}
