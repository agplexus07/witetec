import { Controller, Post, Get, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(ThrottlerGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'Listar chaves de API' })
  @ApiQuery({ name: 'merchant_id', required: false, type: String })
  async getAllApiKeys(@Query('merchant_id') merchantId?: string) {
    if (merchantId) {
      return this.apiKeysService.getMerchantApiKeys(merchantId);
    }
    return this.apiKeysService.getAllApiKeys();
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova chave de API' })
  async createApiKey(@Body() data: CreateApiKeyDto) {
    return this.apiKeysService.createApiKey(data);
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Listar chaves de API do comerciante' })
  async getMerchantApiKeys(@Param('merchantId') merchantId: string) {
    return this.apiKeysService.getMerchantApiKeys(merchantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revogar chave de API' })
  async revokeApiKey(@Param('id') id: string) {
    return this.apiKeysService.revokeApiKey(id);
  }
}