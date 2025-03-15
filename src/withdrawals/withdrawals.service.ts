import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateWithdrawalDto, UpdateWithdrawalStatusDto } from './dto/withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  async createWithdrawal(data: CreateWithdrawalDto) {
    // Verificar saldo disponível
    const { data: merchant } = await supabase
      .from('merchants')
      .select('balance')
      .eq('id', data.merchant_id)
      .single();

    if (!merchant) {
      throw new BadRequestException('Comerciante não encontrado');
    }

    if (merchant.balance < data.amount) {
      throw new BadRequestException('Saldo insuficiente');
    }

    const feeAmount = 2.99; // Taxa fixa por saque
    const netAmount = data.amount - feeAmount;

    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert([
        {
          ...data,
          fee_amount: feeAmount,
          net_amount: netAmount,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return withdrawal;
  }

  async updateWithdrawalStatus(id: string, data: UpdateWithdrawalStatusDto) {
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .update({
        status: data.status,
        ...(data.notes && { notes: data.notes }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Se o saque for concluído, atualizar o saldo do comerciante
    if (data.status === 'completed') {
      await this.updateMerchantBalance(withdrawal.merchant_id, -withdrawal.amount);
    }

    return withdrawal;
  }

  private async updateMerchantBalance(merchantId: string, amount: number) {
    const { error } = await supabase.rpc('update_merchant_balance', {
      p_merchant_id: merchantId,
      p_amount: amount,
    });

    if (error) throw error;
  }

  async getMerchantWithdrawals(merchantId: string) {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}