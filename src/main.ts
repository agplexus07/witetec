import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Sub-Acquirer API')
    .setDescription('API para sistema de sub-adquirência com suporte a PIX')
    .setVersion('1.0')
    .addTag('auth', 'Autenticação e registro')
    .addTag('merchants', 'Gerenciamento de comerciantes')
    .addTag('transactions', 'Processamento de transações PIX')
    .addTag('withdrawals', 'Gerenciamento de saques')
    .addTag('admin', 'Painel administrativo')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Validação global
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // CORS
  app.enableCors();

  await app.listen(3000);
}
bootstrap();