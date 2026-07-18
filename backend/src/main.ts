import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfigService);
  const prefix = config.get('API_PREFIX');

  app.setGlobalPrefix(prefix);
  // CORS_ORIGIN accepts a comma-separated list, so the custom domain, the
  // vercel.app URL and localhost can all be allowed at once. Use "*" to allow any.
  const allowedOrigins = String(config.get('CORS_ORIGIN'))
    .split(',')
    .map((o) => o.trim().replace(/\/$/, '')) // tolerate trailing slashes
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, server-to-server) send no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Waailo HR API')
    .setDescription('Phase 1 — Core HR (Auth, Company, Employees, Documents)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = config.get('PORT');
  await app.listen(port);
  new Logger('Bootstrap').log(`Waailo HR API listening on :${port} (prefix /${prefix})`);
}

void bootstrap();
