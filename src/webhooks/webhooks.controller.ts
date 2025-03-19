import { Controller, Post, Body, Headers } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { OnzWebhookDto } from './dto/webhook.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { logger } from '../config/logger.config';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('onz/pix')
  @ApiOperation({ summary: 'Receber notificação de pagamento PIX da ONZ' })
  async handleOnzWebhook(@Body() data: OnzWebhookDto) {
    try {
      logger.info('Webhook ONZ recebido', { data });
      return this.webhooksService.handleOnzWebhook(data);
    } catch (error) {
      logger.error('Erro ao processar webhook ONZ', { 
        error,
        data 
      });
      throw error;
    }
  }
}