import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { buildBanner } from './common/banner';

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    // За Caddy — доверяем X-Forwarded-*, иначе в журнале сессий будет IP прокси.
    trustProxy: true,
    bodyLimit: 4 * 1024 * 1024,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: false,
  });
  const config = app.get(ConfigService);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(fastifyCookie, { secret: config.getOrThrow<string>('JWT_SECRET') });
  await app.register(fastifyMultipart, {
    // Скан класса — это тридцать листов разом, поэтому лимит на файл щедрый,
    // а на количество — по размеру пачки.
    limits: { fileSize: 25 * 1024 * 1024, files: 60 },
  });
  await app.register(fastifyRateLimit, {
    global: false,
    max: 20,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  // Вход и регистрацию прикрываем от перебора отдельно: остальной API
  // работает без ограничений, чтобы загрузка пачки сканов не упиралась в лимит.
  const instance = app.getHttpAdapter().getInstance();
  instance.addHook('onRoute', (route) => {
    if (typeof route.url === 'string' && /\/api\/auth\/(login|register)$/.test(route.url)) {
      route.config = { ...(route.config ?? {}), rateLimit: { max: 20, timeWindow: '1 minute' } };
    }
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  // В проде фронт и API стоят за одним Caddy на одном домене, поэтому CORS
  // нужен только для локальной разработки с Next на 3001.
  const origin = config.get<string>('FRONTEND_ORIGIN');
  if (origin) {
    app.enableCors({ origin: origin.split(',').map((o) => o.trim()), credentials: true });
  }

  const port = Number(config.get('PORT', 3000));
  await app.listen(port, '0.0.0.0');
  Logger.log(buildBanner(port, config.get<string>('NODE_ENV', 'development')), 'Bootstrap');
}

void bootstrap();
