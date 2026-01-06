import { Controller, Get } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support/admin')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  async listTickets() {
    const tickets = await this.support.listTickets();
    return { items: tickets };
  }
}

