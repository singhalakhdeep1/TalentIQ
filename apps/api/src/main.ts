import './tracing'; // OpenTelemetry — must be first
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });

    // Security
    app.use(helmet());
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:4001'],
        credentials: true,
    });

    // Validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // WebSocket adapter (Socket.IO)
    app.useWebSocketAdapter(new IoAdapter(app));

    // API prefix
    app.setGlobalPrefix('v1', { exclude: ['/health', '/metrics'] });

    // Swagger
    const config = new DocumentBuilder()
        .setTitle('TalentIQ API')
        .setDescription('AI-Powered Recruitment Platform — Event Sourcing + CQRS')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication')
        .addTag('candidates', 'Candidate management')
        .addTag('jobs', 'Job postings')
        .addTag('interviews', 'Interview scheduling & voice sessions')
        .addTag('resume', 'Resume upload & AI parsing')
        .addTag('analytics', 'Hiring funnel analytics (ClickHouse)')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT ?? 4000;
    await app.listen(port);
    logger.log(`TalentIQ API running on http://localhost:${port}`);
    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
