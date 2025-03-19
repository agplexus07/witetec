import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateWebhookDto } from './dto/webhook.dto';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(ThrottlerGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo webhook' })
  async createWebhook(@Body() data: CreateWebhookDto) {
    return this.webhooksService.createWebhook(data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar webhooks do comerciante' })
  @ApiQuery({ name: 'merchant_id', required: true, type: String })
  async getMerchantWebhooks(@Query('merchant_id') merchantId: string) {
    return this.webhooksService.getMerchantWebhooks(merchantId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Testar webhook' })
  async testWebhook(@Param('id') id: string) {
    return this.webhooksService.testWebhook(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar webhook' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() data: CreateWebhookDto,
  ) {
    return this.webhooksService.updateWebhook(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir webhook' })
  async deleteWebhook(@Param('id') id: string) {
    return this.webhooksService.deleteWebhook(id);
  }
}