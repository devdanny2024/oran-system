import { Body, Controller, Post } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post('estimate-site')
  estimateSite(@Body() body: { address: string }) {
    return this.pricing.estimateSite(body?.address ?? '');
  }
}
