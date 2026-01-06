import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { NotificationsService } from './notifications.service';
import { NotificationsAdminController } from './notifications.controller';

@Module({
  providers: [PrismaService, EmailService, NotificationsService],
  controllers: [NotificationsAdminController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

