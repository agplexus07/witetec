import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { OnzWebhookDto } from './dto/webhook.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { logger } from '../config/logger.config';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly transactionsService: TransactionsService
  ) {}

  async handleOnzWebhook(data: OnzWebhookDto) {
    try {
      logger.info('Processando webhook ONZ', {
        txid: data.txid,
        valor: data.valor,
        endToEndId: data.endToEndId
      });

      // Buscar transação pelo txid
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', data.txid)
        .single();

      if (error || !transaction) {
        logger.error('Transação não encontrada para o webhook', {
          txid: data.txid,
          error
        });
        throw new BadRequestException('Transação não encontrada');
      }

      // Atualizar status da transação
      await this.transactionsService.updateTransactionStatus(transaction.id, {
        status: 'completed'
      });

      logger.info('Webhook ONZ processado com sucesso', {
        txid: data.txid,
        transactionId: transaction.id
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao processar webhook ONZ', {
        error,
        data
      });
      throw error;
    }
  }
}