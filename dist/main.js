"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.enableCors();
    await app.listen(3000);
}
bootstrap();
//# sourceMappingURL=main.js.map