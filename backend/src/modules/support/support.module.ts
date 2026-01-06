import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support.admin.controller';

@Module({
  providers: [PrismaService, EmailService, SupportService],
  controllers: [SupportController, SupportAdminController],
  exports: [SupportService],
})
export class SupportModule {}
