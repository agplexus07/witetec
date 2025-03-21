import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateWithdrawalDto, UpdateWithdrawalStatusDto } from './dto/withdrawal.dto';
import { logger } from '../config/logger.config';

@Injectable()
export class WithdrawalsService {
  private readonly WITHDRAWAL_FEE = 6.99;

  async createWithdrawal(data: CreateWithdrawalDto, merchantId: string) {
    try {
      logger.info('Iniciando solicitação de saque', {
        merchantId,
        amount: data.amount
      });

      // Verificar se o comerciante existe e pode realizar saques
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('balance, status, documents_status')
        .eq('id', merchantId)
        .single();

      if (merchantError || !merchant) {
        logger.error('Erro ao buscar comerciante', {
          merchantId,
          error: merchantError
        });
        throw new BadRequestException('Comerciante não encontrado');
      }

      // Verificar se o comerciante está aprovado e com documentos verificados
      if (merchant.status !== 'approved' || merchant.documents_status !== 'approved') {
        throw new BadRequestException('Envie os documentos e aguarde a aprovação para realizar saques');
      }

      const totalAmount = data.amount + this.WITHDRAWAL_FEE;

      if (merchant.balance < totalAmount) {
        throw new BadRequestException(`Saldo insuficiente. Necessário: R$ ${totalAmount.toFixed(2)} (valor + taxa de R$ ${this.WITHDRAWAL_FEE})`);
      }

      // Primeiro criar o registro de saque
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert([
          {
            merchant_id: merchantId,
            amount: data.amount,
            fee_amount: this.WITHDRAWAL_FEE,
            net_amount: data.amount - this.WITHDRAWAL_FEE,
            status: 'pending',
            pix_key_type: data.pix_key_type,
            pix_key: data.pix_key
          },
        ])
        .select()
        .single();

      if (withdrawalError) {
        logger.error('Erro ao criar saque', {
          error: withdrawalError,
          merchantId,
          amount: data.amount
        });
        throw withdrawalError;
      }

      // Deduzir o valor do saldo do comerciante imediatamente
      const { error: balanceError } = await supabase.rpc('update_merchant_balance', {
        p_merchant_id: merchantId,
        p_amount: -totalAmount // Deduz o valor total (saque + taxa)
      });

      if (balanceError) {
        // Se houver erro ao atualizar o saldo, reverter a criação do saque
        await supabase
          .from('withdrawals')
          .delete()
          .eq('id', withdrawal.id);

        logger.error('Erro ao atualizar saldo do comerciante', {
          error: balanceError,
          merchantId,
          amount: totalAmount
        });
        throw new BadRequestException('Erro ao processar saque. Tente novamente.');
      }

      logger.info('Solicitação de saque criada com sucesso', {
        withdrawalId: withdrawal.id,
        merchantId,
        amount: data.amount
      });

      return withdrawal;
    } catch (error) {
      logger.error('Erro ao processar solicitação de saque', {
        error,
        merchantId,
        amount: data.amount
      });
      throw error;
    }
  }

  async updateWithdrawalStatus(id: string, data: UpdateWithdrawalStatusDto) {
    try {
      const { data: withdrawal, error: getError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .single();

      if (getError || !withdrawal) {
        throw new BadRequestException('Saque não encontrado');
      }

      if (withdrawal.status !== 'pending') {
        throw new BadRequestException('Este saque já foi processado');
      }

      const { data: updated, error: updateError } = await supabase
        .from('withdrawals')
        .update({
          status: data.status,
          processed_at: new Date().toISOString(),
          rejection_reason: data.rejection_reason
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Se o saque for rejeitado, devolver o valor ao saldo do comerciante
      if (data.status === 'rejected') {
        const totalAmount = withdrawal.amount + withdrawal.fee_amount;
        await this.updateMerchantBalance(withdrawal.merchant_id, totalAmount);
      }

      logger.info('Status do saque atualizado', {
        withdrawalId: id,
        status: data.status,
        merchantId: withdrawal.merchant_id
      });

      return updated;
    } catch (error) {
      logger.error('Erro ao atualizar status do saque', {
        error,
        withdrawalId: id
      });
      throw error;
    }
  }

  async getMerchantWithdrawals(merchantId: string) {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Erro ao buscar saques do comerciante', {
        error,
        merchantId
      });
      throw error;
    }
  }

  async getPendingWithdrawals() {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          merchants (
            company_name,
            trading_name,
            cnpj
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Erro ao buscar saques pendentes', { error });
      throw error;
    }
  }

  private async updateMerchantBalance(merchantId: string, amount: number) {
    const { error } = await supabase.rpc('update_merchant_balance', {
      p_merchant_id: merchantId,
      p_amount: amount,
    });

    if (error) throw error;
  }
}
