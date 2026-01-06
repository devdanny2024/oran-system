import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support/admin')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  async listTickets() {
    const tickets = await this.support.listTickets();
    return { items: tickets };
  }

  @Post('tickets/:id/reply')
  async reply(
    @Param('id') id: string,
    @Body()
    body: {
      message?: string;
      adminName?: string | null;
      markResolved?: boolean;
    },
  ) {
    const message = (body.message ?? '').trim();
    if (!message) {
      return { message: 'Reply message is required.' };
    }

    return this.support.replyToTicket({
      id,
      replyMessage: message,
      adminName: body.adminName ?? null,
      markResolved: body.markResolved ?? false,
    });
  }
}
