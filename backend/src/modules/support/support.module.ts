import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';

@Module({
  providers: [PrismaService, EmailService, SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
