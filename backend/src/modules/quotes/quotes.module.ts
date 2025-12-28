import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { AgreementsModule } from '../agreements/agreements.module';

@Module({
  imports: [PrismaModule, AiModule, AgreementsModule],
  providers: [QuotesService],
  controllers: [QuotesController],
})
export class QuotesModule {}
