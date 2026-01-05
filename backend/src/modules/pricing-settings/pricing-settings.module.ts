import { Module } from '@nestjs/common';
import { PricingSettingsService } from './pricing-settings.service';
import { PricingSettingsController } from './pricing-settings.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Module({
  providers: [PricingSettingsService, PrismaService],
  controllers: [PricingSettingsController],
  exports: [PricingSettingsService],
})
export class PricingSettingsModule {}

