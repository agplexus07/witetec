import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Put, 
  UseGuards,
  Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { 
  CreateMerchantDto,
  MerchantStatisticsDto,
  ApiResponse as ApiResponseType
} from './dto/merchant.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(ThrottlerGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo comerciante' })
  @ApiResponse({
    status: 201,
    description: 'Comerciante registrado com sucesso',
    type: Object
  })
  async register(@Body() merchantData: CreateMerchantDto, @Req() req: Request) {
    return this.merchantsService.register(merchantData, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do comerciante' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do comerciante',
    type: Object
  })
  async getMerchant(@Param('id') id: string) {
    return this.merchantsService.getMerchantById(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Obter estatísticas do comerciante' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas do comerciante',
    type: MerchantStatisticsDto
  })
  async getStatistics(@Param('id') id: string): Promise<ApiResponseType<MerchantStatisticsDto>> {
    return this.merchantsService.getMerchantStatistics(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Obter dados do dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dados do dashboard',
    type: Object
  })
  async getDashboard(@Param('id') id: string) {
    return this.merchantsService.getDashboardStats(id);
  }
}