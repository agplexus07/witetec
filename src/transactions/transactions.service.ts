import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  async createTransaction(data: CreateTransactionDto) {
    // Calcular taxa e valor líquido
    const { data: merchant } = await supabase
      .from('merchants')
      .select('fee_percentage')
      .eq('id', data.merchant_id)
      .single();

    if (!merchant) {
      throw new BadRequestException('Comerciante não encontrado');
    }

    const feeAmount = (data.amount * merchant.fee_percentage) / 100;
    const netAmount = data.amount - feeAmount;

    const { data: transaction, error } = await supabase
      .from('transactions')
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
    return transaction;
  }

  async updateTransactionStatus(id: string, data: UpdateTransactionStatusDto) {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({ status: data.status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Se a transação for concluída, atualizar o saldo do comerciante
    if (data.status === 'completed') {
      await this.updateMerchantBalance(transaction.merchant_id, transaction.net_amount);
    }

    return transaction;
  }

  private async updateMerchantBalance(merchantId: string, amount: number) {
    const { error } = await supabase.rpc('update_merchant_balance', {
      p_merchant_id: merchantId,
      p_amount: amount,
    });

    if (error) throw error;
  }

  async getMerchantTransactions(merchantId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}