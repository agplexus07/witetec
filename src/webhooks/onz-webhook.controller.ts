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

      // Se recebemos um endToEndId, vamos processar o pagamento
      if (payload.endToEndId) {
        // Primeiro consultar os detalhes do PIX para obter o txid
        const pixDetails = await onzClient.pix.get(payload.endToEndId);

        logger.info('Detalhes do PIX recebidos', {
          endToEndId: pixDetails.endToEndId,
          txid: pixDetails.txid
        });

        // Salvar o txid no banco temporariamente para referência
        const { data: updatedWithTxid, error: txidUpdateError } = await supabase
          .from('transactions')
          .update({
            txid: pixDetails.txid
          })
          .eq('end_to_end_id', payload.endToEndId)
          .select();

        if (txidUpdateError) {
          logger.error('Erro ao salvar txid na transação', {
            error: txidUpdateError,
            txid: pixDetails.txid,
            endToEndId: payload.endToEndId
          });
        }

        // Consultar detalhes da cobrança usando a API da Ecomovi
        const ecomoviUrl = `https://api.pix.ecomovi.com.br/cob/${pixDetails.txid}`;
        
        logger.info('Consultando API da Ecomovi', {
          url: ecomoviUrl
        });
        
        let cobDetails;
        try {
          // Obter o token de acesso usando o mesmo método do PixService
          const accessToken = await onzClient.getAccessToken();
          
          if (!accessToken) {
            logger.error('Falha ao obter token de acesso para consulta da Ecomovi');
            throw new Error('Não foi possível obter o token de acesso');
          }
          
          logger.debug('Token de acesso obtido para consulta da Ecomovi', {
            tokenLength: accessToken.length
          });
          
          const ecomoviResponse = await fetch(ecomoviUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
            signal: AbortSignal.timeout(10000) // 10 segundos de timeout
          });
          
          if (!ecomoviResponse.ok) {
            throw new Error(`Status: ${ecomoviResponse.status} - ${ecomoviResponse.statusText}`);
          }
          
          cobDetails = await ecomoviResponse.json();
          
          logger.info('Detalhes da cobrança recebidos da Ecomovi', {
            txid: pixDetails.txid,
            correlationId: cobDetails.infoAdicionais?.find(info => info.nome === 'correlationID')?.valor
          });
        } catch (error) {
          logger.error('Erro ao consultar API da Ecomovi, usando fallback', {
            error: error.message,
            txid: pixDetails.txid
          });
          
          // Fallback para o método anterior
          cobDetails = await onzClient.pix.status(pixDetails.txid);
          
          logger.info('Detalhes da cobrança obtidos via fallback', {
            txid: pixDetails.txid
          });
        }

        // Obter o correlationID (transaction_id) das informações adicionais
        const correlationId = cobDetails.infoAdicionais?.find(
          info => info.nome === 'correlationID'
        )?.valor;

        if (!correlationId) {
          logger.error('correlationID não encontrado na cobrança', {
            txid: pixDetails.txid,
            endToEndId: pixDetails.endToEndId
          });
          return {
            status: 'error',
            message: 'correlationID não encontrado na cobrança'
          };
        }

        // Buscar a transação pelo transaction_id (correlationID)
        const { data: transaction, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('transaction_id', correlationId)
          .maybeSingle();

        if (!transaction) {
          logger.error('Transação não encontrada', {
            correlationId,
            txid: pixDetails.txid,
            endToEndId: pixDetails.endToEndId
          });

          return { 
            status: 'error',
            message: 'Transação não encontrada',
            correlationId
          };
        }

        // Atualizar a transação com os dados do pagamento
        await this.transactionsService.updateTransactionStatus(transaction.id, {
          status: 'completed'
        });

        // Extrair informações do pagador do objeto cobDetails
        const pagador = cobDetails.pix?.[0]?.pagador || pixDetails.pagador;
        const horario = cobDetails.pix?.[0]?.horario || pixDetails.horario;

        // Atualizar informações adicionais da transação
        await supabase
          .from('transactions')
          .update({
            end_to_end_id: pixDetails.endToEndId,
            txid: pixDetails.txid,
            paid_at: horario,
            payer_info: pagador
          })
          .eq('id', transaction.id);

        logger.info('PIX processado com sucesso', {
          correlationId,
          txid: pixDetails.txid,
          endToEndId: pixDetails.endToEndId,
          valor: cobDetails.valor?.original || pixDetails.valor,
          transactionId: transaction.id
        });

        return { 
          status: 'success',
          message: 'PIX processado com sucesso',
          correlationId,
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
        error: error.message,
        stack: error.stack,
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
