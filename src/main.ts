import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduzir logging em produção
  });

  // Habilitar compressão GZIP
  app.use(compression());

  // Aumentar limites de payload e timeout
  app.use(json({ limit: '10mb' }));
  
  // Configurar timeouts globais
  app.use((req, res, next) => {
    res.setTimeout(30000, () => {
      res.status(408).send('Request Timeout');
    });
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('Sub-Acquirer API')
    .setDescription(`
      API para sistema de sub-adquirência com suporte a PIX.
      
      ## Fluxo de Integração
      1. Registre-se usando o endpoint /auth/register
      2. Faça login usando /auth/login
      3. Cadastre os dados do seu estabelecimento em /merchants/register
      4. Aguarde a aprovação do cadastro
      5. Após aprovado, você poderá gerar cobranças PIX
      
      ## Autenticação
      Todas as requisições (exceto registro e login) devem incluir o token JWT no header:
      \`Authorization: Bearer seu_token_aqui\`
      
      ## Webhooks
      Para receber notificações de mudança de status das transações PIX, configure um endpoint
      para receber as notificações da ONZ.
    `)
    .setVersion('1.0')
    .addTag('auth', 'Autenticação e registro de usuários')
    .addTag('merchants', 'Gerenciamento de comerciantes')
    .addTag('transactions', 'Processamento de transações PIX')
    .addTag('withdrawals', 'Gerenciamento de saques')
    .addTag('admin', 'Painel administrativo')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Entre com seu token JWT',
    })
    .setExternalDoc('Documentação ONZ', 'https://developers.onz.software/reference/accounts/#tag/Pix')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Validação global com performance otimizada
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validateCustomDecorators: false,
    skipMissingProperties: false,
    skipNullProperties: false,
    skipUndefinedProperties: false,
  }));

  // Configurar CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    maxAge: 86400, // 24 horas de cache CORS
  });

  await app.listen(3000);
}
bootstrap();