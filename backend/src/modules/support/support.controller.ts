import { Body, Controller, Post } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post('contact')
  async contact(
    @Body()
    body: {
      userId?: string | null;
      projectId?: string | null;
      category?: string | null;
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    },
  ) {
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim();
    const subject = (body.subject ?? '').trim();
    const message = (body.message ?? '').trim();

    if (!name || !email || !subject || !message) {
      return {
        message: 'Please provide name, email, subject and message.',
      };
    }

    const ticket = await this.support.createTicket({
      userId: body.userId ?? null,
      projectId: body.projectId ?? null,
      category: body.category ?? null,
      name,
      email,
      subject,
      message,
    });

    return { ticket };
  }
}
