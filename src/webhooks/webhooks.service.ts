import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateWebhookDto, OnzWebhookDto } from './dto/webhook.dto';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { TransactionsService } from '../transactions/transactions.service';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { logger } from '../config/logger.config';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly transactionsService: TransactionsService
  ) {}

  async handleOnzWebhook(data: OnzWebhookDto, signature: string) {
    try {
      logger.info('Received ONZ webhook', {
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
        logger.error('Transaction not found for webhook', {
          txid: data.txid,
          error
        });
        throw new BadRequestException('Transação não encontrada');
      }

      // Atualizar status da transação mesmo se estiver expirada
      await this.transactionsService.updateTransactionStatus(transaction.id, {
        status: 'completed'
      });

      // Notificar o comerciante
      await this.sendWebhookEvent(transaction.merchant_id, 'payment.success', {
        transaction_id: transaction.id,
        amount: data.valor,
        payer: data.pagador,
        paid_at: data.horario
      });

      logger.info('ONZ webhook processed successfully', {
        txid: data.txid,
        transactionId: transaction.id
      });

      return { success: true };
    } catch (error) {
      logger.error('Error processing ONZ webhook', {
        error,
        data
      });
      throw error;
    }
  }

  async getAllWebhooks() {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createWebhook(data: CreateWebhookDto) {
    try {
      const secretToken = randomBytes(32).toString('hex');

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .insert([
          {
            merchant_id: data.merchant_id,
            url: data.url,
            description: data.description,
            events: data.events || ['payment.success', 'payment.failed'],
            secret_token: secretToken,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Retornar o token secreto apenas na criação
      return {
        ...webhook,
        secret_token: secretToken,
      };
    } catch (error) {
      throw new BadRequestException('Erro ao criar webhook');
    }
  }

  async getMerchantWebhooks(merchantId: string) {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async testWebhook(id: string) {
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !webhook) {
      throw new BadRequestException('Webhook não encontrado');
    }

    const testPayload = {
      event: 'test.webhook',
      data: {
        message: 'Este é um evento de teste',
        timestamp: new Date().toISOString(),
      },
    };

    const signature = this.apiKeysService.generateWebhookSignature(
      testPayload,
      webhook.secret_token,
    );

    try {
      await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        timeout: 5000,
      });

      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', id);

      return { success: true, message: 'Webhook testado com sucesso' };
    } catch (error) {
      await supabase
        .from('webhooks')
        .update({
          failure_count: webhook.failure_count + 1,
        })
        .eq('id', id);

      throw new BadRequestException('Erro ao testar webhook');
    }
  }

  async sendWebhookEvent(merchantId: string, event: string, payload: any) {
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (!webhooks?.length) return;

    for (const webhook of webhooks) {
      const signature = this.apiKeysService.generateWebhookSignature(
        payload,
        webhook.secret_token,
      );

      try {
        await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          timeout: 5000,
        });

        await supabase
          .from('webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
          })
          .eq('id', webhook.id);
      } catch (error) {
        await supabase
          .from('webhooks')
          .update({
            failure_count: webhook.failure_count + 1,
          })
          .eq('id', webhook.id);
      }
    }
  }
}