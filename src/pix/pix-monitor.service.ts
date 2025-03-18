import { Injectable } from '@nestjs/common';
import { PixService } from './pix.service';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';

@Injectable()
export class PixMonitorService {
  private readonly CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutos em milissegundos
  private isRunning = false;

  constructor(private readonly pixService: PixService) {
    this.startMonitoring();
  }

  private async startMonitoring() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('Iniciando monitoramento de PIX');

    setInterval(async () => {
      try {
        await this.checkPendingTransactions();
      } catch (error) {
        logger.error('Erro ao verificar transações pendentes', { error });
      }
    }, this.CHECK_INTERVAL);
  }

  private async checkPendingTransactions() {
    try {
      // Buscar transações pendentes não expiradas
      const { data: pendingTransactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      if (!pendingTransactions?.length) {
        logger.debug('Nenhuma transação pendente para verificar');
        return;
      }

      logger.info('Verificando transações pendentes', {
        count: pendingTransactions.length
      });

      // Definir período de busca
      const now = new Date();
      const startTime = new Date(now.getTime() - this.CHECK_INTERVAL);

      // Buscar PIX recebidos no período
      const receivedPix = await this.pixService.getReceivedPix({
        startDate: startTime,
        endDate: now,
        page: 0,
        pageSize: 100
      });

      // Processar cada PIX recebido
      for (const pix of receivedPix) {
        // Buscar transação pelo valor e status pendente
        const { data: matchingTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .eq('amount', parseFloat(pix.valor))
          .is('end_to_end_id', null); // Apenas transações sem end_to_end_id

        if (matchingTransactions?.length) {
          // Atualizar a primeira transação que corresponde
          const transaction = matchingTransactions[0];
          await this.updateTransactionStatus(
            transaction.id, 
            'completed',
            pix.endToEndId,
            pix.horario,
            pix.pagador
          );

          logger.info('Transação atualizada com pagamento confirmado', {
            transactionId: transaction.id,
            endToEndId: pix.endToEndId,
            valor: pix.valor,
            pagador: pix.pagador
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao verificar transações pendentes', { error });
      throw error;
    }
  }

  private async updateTransactionStatus(
    transactionId: string, 
    status: string,
    endToEndId: string,
    paidAt: string,
    payerInfo: any
  ) {
    const { error } = await supabase
      .from('transactions')
      .update({
        status,
        end_to_end_id: endToEndId,
        paid_at: paidAt,
        payer_info: payerInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (error) throw error;

    // Se a transação foi completada, atualizar o saldo do comerciante
    if (status === 'completed') {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('merchant_id, net_amount')
        .eq('id', transactionId)
        .single();

      if (transaction) {
        await this.updateMerchantBalance(transaction.merchant_id, transaction.net_amount);
        logger.info('Saldo do comerciante atualizado', {
          merchantId: transaction.merchant_id,
          amount: transaction.net_amount
        });
      }
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