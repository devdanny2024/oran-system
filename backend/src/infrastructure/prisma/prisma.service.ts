import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.warn(
        'PrismaService: DATABASE_URL is not set; skipping initial DB connect.',
      );
      return;
    }

    try {
      await this.$connect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        'PrismaService: failed to connect to database on startup. The app will still run, but DB operations may fail.',
        error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
