import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentPlanService } from './payment-plan.service';
import { PaymentPlanType } from '@prisma/client';

@Controller('projects/:projectId/payment-plan')
export class PaymentPlanController {
  constructor(private readonly paymentPlanService: PaymentPlanService) {}

  @Get()
  async get(@Param('projectId') projectId: string) {
    const plan = await this.paymentPlanService.getForProject(projectId);
    return plan ?? {};
  }

  @Post()
  async set(
    @Param('projectId') projectId: string,
    @Body() body: { type: PaymentPlanType },
  ) {
    return this.paymentPlanService.setForProject(projectId, body.type);
  }
}

