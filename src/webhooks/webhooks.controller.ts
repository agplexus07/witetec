import { Controller, Post, Get, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, OnzWebhookDto, ChargebackWebhookDto } from './dto/webhook.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { logger } from '../config/logger.config';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(ThrottlerGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('onz/pix')
  @ApiOperation({ summary: 'Receber notificação de pagamento PIX da ONZ' })
  async handleOnzWebhook(
    @Body() data: any,
    @Headers('x-webhook-signature') signature: string
  ) {
    try {
      logger.info('Webhook ONZ recebido', { 
        data,
        hasSignature: !!signature 
      });

      // Mapear os dados recebidos para nosso formato
      const pixData: OnzWebhookDto = {
        txid: data.txid,
        valor: data.valor,
        horario: data.horario,
        pagador: data.pagador,
        endToEndId: data.endToEndId
      };

      const result = await this.webhooksService.handleOnzWebhook(pixData, signature);
      
      logger.info('Webhook ONZ processado com sucesso', { result });
      
      return result;
    } catch (error) {
      logger.error('Erro ao processar webhook ONZ', { 
        error,
        data 
      });
      throw error;
    }
  }

  @Post('onz/chargeback')
  @ApiOperation({ summary: 'Receber notificação de chargeback da ONZ' })
  async handleChargebackWebhook(
    @Body() data: ChargebackWebhookDto,
    @Headers('x-webhook-signature') signature: string
  ) {
    try {
      logger.info('Webhook de chargeback recebido', {
        transactionId: data.transaction_id,
        amount: data.amount
      });

      const result = await this.webhooksService.handleChargebackWebhook(data, signature);

      logger.info('Webhook de chargeback processado com sucesso', { result });

      return result;
    } catch (error) {
      logger.error('Erro ao processar webhook de chargeback', {
        error,
        data
      });
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os webhooks' })
  async getAllWebhooks() {
    return this.webhooksService.getAllWebhooks();
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova configuração de webhook' })
  async createWebhook(@Body() data: CreateWebhookDto) {
    return this.webhooksService.createWebhook(data);
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Listar webhooks do comerciante' })
  async getMerchantWebhooks(@Param('merchantId') merchantId: string) {
    return this.webhooksService.getMerchantWebhooks(merchantId);
  }

  @Post('test/:id')
  @ApiOperation({ summary: 'Testar webhook' })
  async testWebhook(@Param('id') id: string) {
    return this.webhooksService.testWebhook(id);
  }
}