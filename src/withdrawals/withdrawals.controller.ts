import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, UpdateWithdrawalStatusDto } from './dto/withdrawal.dto';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  async createWithdrawal(@Body() data: CreateWithdrawalDto) {
    return this.withdrawalsService.createWithdrawal(data);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateWithdrawalStatusDto,
  ) {
    return this.withdrawalsService.updateWithdrawalStatus(id, data);
  }

  @Get('merchant/:merchantId')
  async getMerchantWithdrawals(@Param('merchantId') merchantId: string) {
    return this.withdrawalsService.getMerchantWithdrawals(merchantId);
  }
}