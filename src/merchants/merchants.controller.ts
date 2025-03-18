import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Put, 
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { 
  CreateMerchantDto, 
  UpdateMerchantFeeDto, 
  UpdateMerchantStatusDto,
  MerchantStatisticsDto
} from './dto/merchant.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(ThrottlerGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo comerciante com documentos' })
  async register(@Body() merchantData: CreateMerchantDto) {
    return this.merchantsService.register(merchantData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do comerciante' })
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
  async getStatistics(@Param('id') id: string): Promise<MerchantStatisticsDto> {
    return this.merchantsService.getMerchantStatistics(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Obter dados do dashboard' })
  async getDashboard(@Param('id') id: string) {
    return this.merchantsService.getDashboardStats(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Atualizar status do comerciante' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateMerchantStatusDto,
  ) {
    return this.merchantsService.updateMerchantStatus(id, data.status, data.rejection_reason);
  }

  @Put(':id/fee')
  @ApiOperation({ summary: 'Atualizar taxa do comerciante' })
  async updateFee(
    @Param('id') id: string,
    @Body() data: UpdateMerchantFeeDto,
  ) {
    return this.merchantsService.updateMerchantFee(id, data.feePercentage);
  }
}