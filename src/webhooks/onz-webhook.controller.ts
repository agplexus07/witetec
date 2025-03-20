import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from '../transactions/transactions.service';
import { logger } from '../config/logger.config';
import { supabase } from '../config/supabase.config';

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
        endToEndId: payload.data?.endToEndId,
        txid: payload.data?.txid
      });

      // Processar notificação de PIX
      if (payload.event === 'pix.received') {
        const { endToEndId, txid, valor, horario, pagador } = payload.data;

        // Primeiro, tentar buscar pelo transaction_id
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('transaction_id', txid)
          .single();

        if (error || !transactions) {
          logger.warn('Transação não encontrada pelo transaction_id', { 
            txid,
            error: error?.message 
          });

          // Tentar buscar pelo ID diretamente
          const { data: transactionById, error: errorById } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', txid)
            .single();

          if (errorById || !transactionById) {
            logger.error('Transação não encontrada em nenhuma busca', {
              txid,
              endToEndId,
              error: errorById?.message
            });

            return { 
              status: 'error',
              message: 'Transação não encontrada',
              txid,
              endToEndId
            };
          }

          // Se encontrou pelo ID
          await this.transactionsService.updateTransactionStatus(transactionById.id, {
            status: 'completed'
          });

          logger.info('PIX processado com sucesso (busca por ID)', {
            txid: transactionById.id,
            endToEndId,
            valor
          });

          return {
            status: 'success',
            message: 'PIX processado com sucesso',
            txid: transactionById.id
          };
        }

        // Se encontrou pelo transaction_id
        await this.transactionsService.updateTransactionStatus(transactions.id, {
          status: 'completed'
        });

        logger.info('PIX processado com sucesso', {
          txid,
          endToEndId,
          valor
        });

        return { 
          status: 'success',
          message: 'PIX processado com sucesso',
          txid 
        };
      }

      return { 
        status: 'ignored', 
        message: 'Evento não processado',
        event: payload.event 
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
