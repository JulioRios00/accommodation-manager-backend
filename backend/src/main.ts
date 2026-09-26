// ConfigModule.forRoot() (in app.module.ts) only loads .env once Nest bootstraps AppModule,
// which happens after this file's imports have already run — too late for instrument.ts's
// Sentry.init() to see SENTRY_DSN. Load .env here, first, so it's already in process.env.
import 'dotenv/config';
import './instrument';

import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
bootstrap();
