import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from '../transactions/transactions.service';
import { logger } from '../config/logger.config';

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

        // Buscar transação pelo transaction_id (txid)
        const { data: transaction } = await this.transactionsService.getTransactionDetails(txid);

        if (!transaction) {
          logger.warn('Transação não encontrada', { txid });
          return { 
            status: 'error',
            message: 'Transação não encontrada',
            txid 
          };
        }

        // Atualizar status da transação
        await this.transactionsService.updateTransactionStatus(transaction.id, {
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
