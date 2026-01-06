import { Module } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [AgreementsService],
  controllers: [AgreementsController],
  exports: [AgreementsService],
})
export class AgreementsModule {}
