import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { EmailModule } from '../../infrastructure/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
