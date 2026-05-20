import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors();
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidUnknownValues: true,
        }),
    );

    const config = new DocumentBuilder()
        .setTitle('TalentIQ BFF')
        .setDescription('Web aggregation layer for TalentIQ')
        .setVersion('1.0.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/docs', app, document);

    await app.listen(process.env.BFF_PORT ? Number(process.env.BFF_PORT) : 4001);
}

bootstrap();
