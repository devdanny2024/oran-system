import { Body, Controller, Get, Patch } from '@nestjs/common';
import { PricingSettingsService } from './pricing-settings.service';

@Controller('pricing-settings')
export class PricingSettingsController {
  constructor(private readonly pricingSettings: PricingSettingsService) {}

  @Get()
  async get() {
    const settings = await this.pricingSettings.get();

    return {
      logisticsPerTripLagos: Number(settings.logisticsPerTripLagos),
      logisticsPerTripWestNear: Number(settings.logisticsPerTripWestNear),
      logisticsPerTripOther: Number(settings.logisticsPerTripOther),
      miscRatePercent: Number(settings.miscRate) * 100,
      taxRatePercent: Number(settings.taxRate) * 100,
    };
  }

  @Patch()
  async update(
    @Body()
    body: {
      logisticsPerTripLagos?: number;
      logisticsPerTripWestNear?: number;
      logisticsPerTripOther?: number;
      miscRatePercent?: number;
      taxRatePercent?: number;
    },
  ) {
    const updated = await this.pricingSettings.update(body);

    return {
      logisticsPerTripLagos: Number(updated.logisticsPerTripLagos),
      logisticsPerTripWestNear: Number(updated.logisticsPerTripWestNear),
      logisticsPerTripOther: Number(updated.logisticsPerTripOther),
      miscRatePercent: Number(updated.miscRate) * 100,
      taxRatePercent: Number(updated.taxRate) * 100,
    };
  }
}

