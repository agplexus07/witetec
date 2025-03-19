import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateWebhookDto } from './dto/webhook.dto';
import { randomBytes } from 'crypto';
import { logger } from '../config/logger.config';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  async createWebhook(data: CreateWebhookDto) {
    try {
      // Gerar token secreto
      const secretToken = randomBytes(32).toString('hex');

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .insert([
          {
            merchant_id: data.merchant_id,
            url: data.url,
            description: data.description,
            events: data.events,
            secret_token: secretToken,
            is_active: true // Garantir que o webhook seja criado como ativo
          }
        ])
        .select()
        .single();

      if (error) throw error;

      logger.info('Webhook created', {
        webhookId: webhook.id,
        merchantId: data.merchant_id
      });

      // Retornar o token secreto apenas na criação
      return {
        ...webhook,
        secret_token: secretToken
      };
    } catch (error) {
      logger.error('Error creating webhook', {
        error,
        merchantId: data.merchant_id
      });
      throw error;
    }
  }

  async getMerchantWebhooks(merchantId: string) {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching merchant webhooks', {
        error,
        merchantId
      });
      throw error;
    }
  }

  async testWebhook(id: string) {
    try {
      // Buscar o webhook
      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !webhook) {
        throw new NotFoundException('Webhook não encontrado');
      }

      // Preparar payload de teste
      const testPayload = {
        event: 'webhook.test',
        data: {
          message: 'Este é um evento de teste',
          timestamp: new Date().toISOString()
        }
      };

      // Gerar assinatura
      const signature = this.generateSignature(testPayload, webhook.secret_token);

      try {
        // Enviar requisição de teste
        const response = await axios.post(webhook.url, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature
          },
          timeout: 5000 // 5 segundos timeout
        });

        // Atualizar status do webhook
        await supabase
          .from('webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
            is_active: true
          })
          .eq('id', id);

        return {
          success: true,
          status: response.status,
          message: 'Webhook testado com sucesso'
        };

      } catch (requestError) {
        // Incrementar contador de falhas
        await supabase
          .from('webhooks')
          .update({
            failure_count: webhook.failure_count + 1,
            last_triggered_at: new Date().toISOString(),
            is_active: false // Desativar webhook após falha
          })
          .eq('id', id);

        return {
          success: false,
          error: requestError.message,
          message: 'Falha ao testar webhook'
        };
      }
    } catch (error) {
      logger.error('Error testing webhook', {
        error,
        webhookId: id
      });
      throw error;
    }
  }

  async updateWebhook(id: string, data: CreateWebhookDto) {
    try {
      const { data: webhook, error } = await supabase
        .from('webhooks')
        .update({
          url: data.url,
          description: data.description,
          events: data.events,
          is_active: true // Reativar webhook ao atualizar
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!webhook) throw new NotFoundException('Webhook não encontrado');

      logger.info('Webhook updated', {
        webhookId: id,
        merchantId: data.merchant_id
      });

      return webhook;
    } catch (error) {
      logger.error('Error updating webhook', {
        error,
        webhookId: id
      });
      throw error;
    }
  }

  async deleteWebhook(id: string) {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Webhook deleted', { webhookId: id });

      return { message: 'Webhook excluído com sucesso' };
    } catch (error) {
      logger.error('Error deleting webhook', {
        error,
        webhookId: id
      });
      throw error;
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}