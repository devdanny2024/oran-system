import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [QuotesService],
  controllers: [QuotesController],
})
export class QuotesModule {}
