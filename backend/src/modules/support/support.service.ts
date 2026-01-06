import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async createTicket(params: {
    userId?: string | null;
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: params.userId ?? null,
        name: params.name,
        email: params.email,
        subject: params.subject,
        message: params.message,
      },
    });

    const adminEmail =
      process.env.SUPPORT_INBOX_EMAIL || process.env.SMTP_FROM || '';
    if (adminEmail) {
      const html = `
        <p>A new support request has been submitted from the ORAN website.</p>
        <p>
          <strong>Name:</strong> ${ticket.name}<br />
          <strong>Email:</strong> ${ticket.email}<br />
          <strong>Subject:</strong> ${ticket.subject}
        </p>
        <p><strong>Message:</strong></p>
        <p>${ticket.message.replace(/\n/g, '<br />')}</p>
      `;

      await (this.email as any)['sendEmail']?.({
        to: adminEmail,
        subject: `[ORAN] New support request: ${ticket.subject}`,
        html,
      });
    }

    return ticket;
  }

  async listTickets() {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async replyToTicket(params: {
    id: string;
    replyMessage: string;
    adminName?: string | null;
    markResolved?: boolean;
  }) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      throw new Error('Support ticket not found');
    }

    const greetingName = ticket.name || 'there';
    const adminName = params.adminName?.trim() || 'ORAN support';

    const html = `
      <p>Hi ${greetingName},</p>
      <p>${params.replyMessage.replace(/\n/g, '<br />')}</p>
      <p>Best regards,<br />${adminName}</p>
    `;

    await (this.email as any)['sendEmail']?.({
      to: ticket.email,
      subject: `Re: ${ticket.subject}`,
      html,
    });

    const nextStatus =
      params.markResolved === true && ticket.status !== 'RESOLVED'
        ? 'RESOLVED'
        : ticket.status === 'OPEN'
          ? 'IN_PROGRESS'
          : ticket.status;

    if (nextStatus !== ticket.status) {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: nextStatus as any },
      });
    }

    return { ticketId: ticket.id, status: nextStatus };
  }
}
