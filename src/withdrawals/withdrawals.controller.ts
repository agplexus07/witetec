import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, UpdateWithdrawalStatusDto, WithdrawalResponseDto } from './dto/withdrawal.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
@UseGuards(ThrottlerGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('merchant/:merchantId')
  @ApiOperation({ summary: 'Solicitar novo saque' })
  @ApiResponse({
    status: 201,
    description: 'Saque solicitado com sucesso',
    type: WithdrawalResponseDto
  })
  async createWithdrawal(
    @Body() data: CreateWithdrawalDto,
    @Param('merchantId') merchantId: string
  ) {
    return this.withdrawalsService.createWithdrawal(data, merchantId);
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Listar saques do comerciante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de saques',
    type: [WithdrawalResponseDto]
  })
  async getMerchantWithdrawals(@Param('merchantId') merchantId: string) {
    return this.withdrawalsService.getMerchantWithdrawals(merchantId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Listar saques pendentes (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de saques pendentes',
    type: [WithdrawalResponseDto]
  })
  async getPendingWithdrawals() {
    return this.withdrawalsService.getPendingWithdrawals();
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Atualizar status do saque (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    type: WithdrawalResponseDto
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateWithdrawalStatusDto,
  ) {
    return this.withdrawalsService.updateWithdrawalStatus(id, data);
  }
}