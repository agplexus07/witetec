import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto/transaction.dto';
import { PixService } from '../pix/pix.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly pixService: PixService) {}

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

    // Gerar cobrança PIX
    const pixCharge = await this.pixService.createPixCharge({
      amount: data.amount,
      merchantId: data.merchant_id,
      description: data.description,
      transactionId: data.transaction_id
    });

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert([
        {
          ...data,
          fee_amount: feeAmount,
          net_amount: netAmount,
          status: 'pending',
          pix_data: {
            qr_code: pixCharge.qrCode,
            qr_code_image: pixCharge.qrCodeImage,
            payment_link: pixCharge.paymentLinkUrl,
            expires_at: pixCharge.expiresAt
          }
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

    // Se for chargeback, criar reembolso PIX
    if (data.status === 'chargeback') {
      await this.pixService.refundPix({
        transactionId: transaction.transaction_id,
        amount: transaction.amount,
        reason: 'Chargeback solicitado'
      });
    }

    return transaction;
  }

  async checkTransactionStatus(transactionId: string) {
    const pixStatus = await this.pixService.getPixStatus(transactionId);
    
    if (pixStatus.status === 'COMPLETED') {
      await this.updateTransactionStatus(transactionId, { status: 'completed' });
    } else if (pixStatus.status === 'EXPIRED' || pixStatus.status === 'CANCELLED') {
      await this.updateTransactionStatus(transactionId, { status: 'failed' });
    }

    return pixStatus;
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