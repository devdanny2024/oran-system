import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post('estimate-site')
  estimateSite(@Body() body: { address: string }) {
    return this.pricing.estimateSite(body?.address ?? '');
  }

  @Get('address-suggestions')
  addressSuggestions(@Query('input') input: string) {
    return this.pricing.addressSuggestions(input ?? '');
  }
}
