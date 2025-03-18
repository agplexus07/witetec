import { Controller, Post, Body, Get, Param, Put, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';
import { 
  CreateTransactionDto, 
  UpdateTransactionStatusDto,
  TransactionListQueryDto,
  TransactionResponseDto,
  TransactionDetailsDto,
  CreatePixDto,
  CheckPixStatusDto
} from './dto/transaction.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/api-key.guard';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('pix/create')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Gerar cobrança PIX' })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Chave de API',
    required: true
  })
  @ApiResponse({
    status: 201,
    description: 'QR Code PIX gerado com sucesso',
    type: TransactionResponseDto
  })
  async createPix(
    @Body() data: CreatePixDto,
    @Req() request: Request & { merchantId: string }
  ) {
    return this.transactionsService.createPixTransaction(data, request.merchantId);
  }

  @Post('pix/check-status')
  @ApiOperation({ summary: 'Verificar status do pagamento PIX' })
  @ApiResponse({
    status: 200,
    description: 'Status do PIX consultado com sucesso'
  })
  async checkPixStatus(@Body() data: CheckPixStatusDto) {
    return this.transactionsService.checkPixStatus(data.txid);
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Listar transações do comerciante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de transações',
    type: [TransactionResponseDto]
  })
  async getMerchantTransactions(
    @Param('merchantId') merchantId: string,
    @Query() query: TransactionListQueryDto
  ) {
    return this.transactionsService.getMerchantTransactions(merchantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes da transação' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da transação',
    type: TransactionDetailsDto
  })
  async getTransactionDetails(@Param('id') id: string) {
    return this.transactionsService.getTransactionDetails(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateTransactionStatus(id, data);
  }
}