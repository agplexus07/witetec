import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto/transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async createTransaction(@Body() data: CreateTransactionDto) {
    return this.transactionsService.createTransaction(data);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateTransactionStatus(id, data);
  }

  @Get('merchant/:merchantId')
  async getMerchantTransactions(@Param('merchantId') merchantId: string) {
    return this.transactionsService.getMerchantTransactions(merchantId);
  }
}