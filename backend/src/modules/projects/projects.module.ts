import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AdminProjectsController } from './admin-projects.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { PaystackModule } from '../../infrastructure/paystack/paystack.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EmailModule, PaystackModule, NotificationsModule],
  controllers: [ProjectsController, AdminProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
