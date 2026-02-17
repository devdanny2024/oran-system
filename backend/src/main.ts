import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ORAN backend listening on port ${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap backend', error);
  process.exit(1);
});

