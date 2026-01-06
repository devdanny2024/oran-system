import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async createAdminNotification(params: {
    type: string;
    title: string;
    message: string;
    sendEmail?: boolean;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });

    if (params.sendEmail) {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
      });

      for (const admin of admins) {
        if (!admin.email) continue;
        await (this.email as any)['sendEmail']?.({
          to: admin.email,
          subject: params.title,
          html: `<p>${params.message.replace(/\n/g, '<br />')}</p>`,
        });
      }
    }

    return notification;
  }

  async listAdminNotifications(limit = 20) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
