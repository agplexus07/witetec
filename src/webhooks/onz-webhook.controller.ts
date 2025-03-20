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
        endToEndId: payload.data?.endToEndId
      });

      // Processar notificação de PIX
      if (payload.event === 'pix.received') {
        const { endToEndId, txid, valor, horario, pagador } = payload.data;

        // Atualizar status da transação
        await this.transactionsService.updateTransactionStatus(txid, {
          status: 'completed'
        });

        logger.info('PIX processado com sucesso', {
          txid,
          endToEndId,
          valor
        });

        return { status: 'success' };
      }

      return { status: 'ignored', message: 'Evento não processado' };
    } catch (error) {
      logger.error('Erro ao processar webhook', {
        error,
        payload
      });
      throw error;
    }
  }
}