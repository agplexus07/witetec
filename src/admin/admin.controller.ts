import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { 
  UpdateMerchantFeeDto, 
  UpdateMerchantStatusDto, 
  DateRangeDto,
  MerchantRevenueFilterDto,
  AdminMetricsDto,
  MerchantRevenueDto,
  UpdateDocumentStatusDto,
  UpdateDocumentsStatusDto
} from './dto/admin.dto';
import { UpdateWithdrawalStatusDto } from '../withdrawals/dto/withdrawal.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obter métricas gerais do admin' })
  @ApiResponse({
    status: 200,
    description: 'Métricas gerais do sistema',
    type: AdminMetricsDto
  })
  async getAdminMetrics() {
    return this.adminService.getAdminMetrics();
  }

  @Get('merchants/revenue/details')
  @ApiOperation({ summary: 'Obter detalhes de receita por lojista' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes de receita por lojista',
    type: [MerchantRevenueDto]
  })
  async getMerchantRevenueDetails() {
    return this.adminService.getMerchantRevenueDetails();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Obter estatísticas gerais do dashboard' })
  async getDashboardStats(@Query() dateRange: DateRangeDto) {
    return this.adminService.getDashboardStats(dateRange);
  }

  @Get('merchants')
  @ApiOperation({ summary: 'Listar todos os comerciantes' })
  async getAllMerchants() {
    return this.adminService.getAllMerchants();
  }

  @Get('merchants/:id')
  @ApiOperation({ summary: 'Obter detalhes de um comerciante' })
  async getMerchantDetails(@Param('id') id: string) {
    return this.adminService.getMerchantDetails(id);
  }

  @Get('merchants/revenue')
  @ApiOperation({ summary: 'Obter métricas de faturamento dos comerciantes' })
  async getMerchantsRevenue(@Query() filter: MerchantRevenueFilterDto) {
    return this.adminService.getMerchantsRevenue(filter);
  }

  @Put('merchants/:id/fee')
  @ApiOperation({ summary: 'Atualizar taxa do comerciante' })
  async updateMerchantFee(
    @Param('id') id: string,
    @Body() data: UpdateMerchantFeeDto,
  ) {
    return this.adminService.updateMerchantFee(id, data);
  }

  @Put('merchants/:id/status')
  @ApiOperation({ summary: 'Atualizar status do comerciante' })
  async updateMerchantStatus(
    @Param('id') id: string,
    @Body() data: UpdateMerchantStatusDto,
  ) {
    return this.adminService.updateMerchantStatus(id, data);
  }

  @Get('merchants/:id/documents')
  @ApiOperation({ summary: 'Listar documentos do comerciante' })
  async getMerchantDocuments(@Param('id') id: string) {
    return this.adminService.getMerchantDocuments(id);
  }

  @Put('merchants/:merchantId/documents/:documentId/status')
  @ApiOperation({ summary: 'Atualizar status de um documento' })
  async updateDocumentStatus(
    @Param('merchantId') merchantId: string,
    @Param('documentId') documentId: string,
    @Body() data: UpdateDocumentStatusDto,
  ) {
    return this.adminService.updateDocumentStatus(merchantId, documentId, data);
  }

  @Put('merchants/:merchantId/documents/status')
  @ApiOperation({ summary: 'Atualizar status de múltiplos documentos' })
  async updateDocumentsStatus(
    @Param('merchantId') merchantId: string,
    @Body() data: UpdateDocumentsStatusDto,
  ) {
    return this.adminService.updateDocumentsStatus(merchantId, data);
  }

  @Get('chargebacks')
  @ApiOperation({ summary: 'Listar chargebacks' })
  async getChargebacks(@Query() dateRange: DateRangeDto) {
    return this.adminService.getChargebacks(dateRange);
  }

  @Get('withdrawals/pending')
  @ApiOperation({ summary: 'Listar saques pendentes' })
  async getPendingWithdrawals() {
    return this.adminService.getPendingWithdrawals();
  }

  @Put('withdrawals/:id/status')
  @ApiOperation({ summary: 'Atualizar status do saque' })
  async updateWithdrawalStatus(
    @Param('id') id: string,
    @Body() data: UpdateWithdrawalStatusDto,
  ) {
    return this.adminService.updateWithdrawalStatus(id, data);
  }
}