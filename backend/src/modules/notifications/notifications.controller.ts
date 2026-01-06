import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications/admin')
export class NotificationsAdminController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) || 20 : 20;
    const items = await this.notifications.listAdminNotifications(parsedLimit);
    return { items };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string) {
    const item = await this.notifications.markAsRead(id);
    return { item };
  }
}

