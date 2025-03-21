import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from '../transactions/transactions.service';
import { logger } from '../config/logger.config';
import { supabase } from '../config/supabase.config';
import { onzClient } from '../config/onz.config';

@ApiTags('webhooks')
@Controller('webhooks/onz/pix')
export class OnzWebhookController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Webhook para receber notificações de PIX da ONZ' })
  async handlePixWebhook(@Body() payload: any) {
    try {
      logger.info('Recebido webhook da ONZ', {
        event: payload.event,
        endToEndId: payload.endToEndId
      });

      // Se recebemos um endToEndId, vamos consultar os detalhes do PIX
      if (payload.endToEndId) {
        // Consultar detalhes do PIX usando o endToEndId
        const pixDetails = await onzClient.pix.get(payload.endToEndId);

        logger.info('Detalhes do PIX recebidos', {
          endToEndId: pixDetails.endToEndId,
          txid: pixDetails.txid,
          valor: pixDetails.valor,
          horario: pixDetails.horario,
          pagador: pixDetails.pagador
        });

        // Primeiro tentar buscar pelo txid
        let { data: transaction, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('transaction_id', pixDetails.txid)
          .maybeSingle();

        // Se não encontrou pelo txid, tentar pelo ID diretamente
        if (!transaction) {
          const { data: transactionById, error: errorById } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', pixDetails.txid)
            .single();

          if (errorById || !transactionById) {
            logger.error('Transação não encontrada em nenhuma busca', {
              txid: pixDetails.txid,
              endToEndId: pixDetails.endToEndId,
              error: errorById?.message
            });

            return { 
              status: 'error',
              message: 'Transação não encontrada',
              txid: pixDetails.txid,
              endToEndId: pixDetails.endToEndId
            };
          }

          transaction = transactionById;
        }

        // Atualizar a transação com os dados do pagamento
        await this.transactionsService.updateTransactionStatus(transaction.id, {
          status: 'completed'
        });

        // Atualizar informações adicionais da transação
        await supabase
          .from('transactions')
          .update({
            end_to_end_id: pixDetails.endToEndId,
            paid_at: pixDetails.horario,
            payer_info: pixDetails.pagador
          })
          .eq('id', transaction.id);

        logger.info('PIX processado com sucesso', {
          txid: pixDetails.txid,
          endToEndId: pixDetails.endToEndId,
          valor: pixDetails.valor,
          transactionId: transaction.id
        });

        return { 
          status: 'success',
          message: 'PIX processado com sucesso',
          txid: pixDetails.txid,
          transactionId: transaction.id
        };
      }

      return { 
        status: 'ignored', 
        message: 'Webhook sem endToEndId',
        payload 
      };
    } catch (error) {
      logger.error('Erro ao processar webhook', {
        error,
        payload
      });
      throw error;
    }
  }
}
