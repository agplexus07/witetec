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

      if (!payload.endToEndId) {
        return { 
          status: 'ignored', 
          message: 'Webhook sem endToEndId',
          payload 
        };
      }

      // Primeiro consultar os detalhes do PIX para obter o txid
      const pixDetails = await onzClient.pix.get(payload.endToEndId);

      logger.info('Detalhes do PIX recebidos', {
        endToEndId: pixDetails.endToEndId,
        txid: pixDetails.txid
      });

      // Salvar o txid temporariamente
      const { error: txidUpdateError } = await supabase
        .from('transactions')
        .update({
          txid: pixDetails.txid,
          end_to_end_id: payload.endToEndId
        })
        .eq('end_to_end_id', payload.endToEndId);

      if (txidUpdateError) {
        logger.error('Erro ao salvar txid na transação', {
          error: txidUpdateError,
          txid: pixDetails.txid,
          endToEndId: payload.endToEndId
        });
      }

      // Consultar detalhes da cobrança na API da Ecomovi
      const accessToken = await onzClient.getAccessToken();
      
      if (!accessToken) {
        throw new Error('Não foi possível obter o token de acesso');
      }

      const ecomoviUrl = `https://api.pix.ecomovi.com.br/cob/${pixDetails.txid}`;
      
      logger.info('Consultando API da Ecomovi', {
        url: ecomoviUrl
      });

      const ecomoviResponse = await fetch(ecomoviUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!ecomoviResponse.ok) {
        throw new Error(`Status: ${ecomoviResponse.status} - ${ecomoviResponse.statusText}`);
      }

      const cobDetails = await ecomoviResponse.json();

      logger.info('Detalhes da cobrança recebidos da Ecomovi', {
        txid: pixDetails.txid,
        status: cobDetails.status
      });

      // Extrair o correlationID das informações adicionais
      const correlationId = cobDetails.infoAdicionais?.find(
        info => info.nome === 'correlationID'
      )?.valor;

      if (!correlationId) {
        logger.error('correlationID não encontrado na cobrança', {
          txid: pixDetails.txid,
          endToEndId: pixDetails.endToEndId,
          infoAdicionais: cobDetails.infoAdicionais
        });
        return {
          status: 'error',
          message: 'correlationID não encontrado na cobrança'
        };
      }

      // Buscar a transação pelo transaction_id (correlationID)
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', correlationId)
        .maybeSingle();

      if (transactionError || !transaction) {
        logger.error('Transação não encontrada', {
          correlationId,
          txid: pixDetails.txid,
          endToEndId: pixDetails.endToEndId,
          error: transactionError
        });

        return { 
          status: 'error',
          message: 'Transação não encontrada',
          correlationId
        };
      }

      // Extrair informações do pagamento
      const pixInfo = cobDetails.pix?.[0];
      const pagador = pixInfo?.pagador || cobDetails.devedor;
      const horario = pixInfo?.horario || cobDetails.calendario?.criacao;

      // Atualizar a transação com todos os dados necessários
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          txid: pixDetails.txid,
          end_to_end_id: pixDetails.endToEndId,
          paid_at: horario,
          payer_info: pagador,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) {
        logger.error('Erro ao atualizar transação', {
          error: updateError,
          transactionId: transaction.id
        });
        throw updateError;
      }

      // Atualizar o saldo do comerciante
      await this.transactionsService.updateTransactionStatus(transaction.id, {
        status: 'completed'
      });

      logger.info('PIX processado com sucesso', {
        correlationId,
        txid: pixDetails.txid,
        endToEndId: pixDetails.endToEndId,
        valor: cobDetails.valor?.original,
        transactionId: transaction.id
      });

      return { 
        status: 'success',
        message: 'PIX processado com sucesso',
        correlationId,
        transactionId: transaction.id
      };

    } catch (error) {
      logger.error('Erro ao processar webhook', {
        error: {
          message: error.message,
          stack: error.stack
        },
        payload
      });
      
      return {
        status: 'error',
        message: 'Erro ao processar webhook',
        error: error.message
      };
    }
  }
}
