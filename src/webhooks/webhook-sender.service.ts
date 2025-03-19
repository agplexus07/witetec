import { Injectable } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { createHmac } from 'crypto';
import axios from 'axios';
import { logger } from '../config/logger.config';

@Injectable()
export class WebhookSenderService {
  async sendWebhookNotification(merchantId: string, event: string, data: any) {
    try {
      // Buscar webhooks ativos do comerciante
      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true);

      if (error) throw error;

      if (!webhooks?.length) {
        logger.debug('No active webhooks found for merchant', { merchantId });
        return;
      }

      // Enviar para cada webhook configurado
      const sendPromises = webhooks.map(webhook => {
        // Verificar se o webhook está inscrito neste evento
        const events = webhook.events as string[];
        if (!events.includes(event)) {
          return;
        }

        // Preparar payload
        const payload = {
          event,
          data,
          timestamp: new Date().toISOString()
        };

        // Gerar assinatura
        const signature = this.generateSignature(payload, webhook.secret_token);

        // Enviar webhook
        return this.sendHttpRequest(webhook, payload, signature);
      });

      await Promise.all(sendPromises);

      logger.info('Webhook notifications sent successfully', {
        merchantId,
        event,
        webhookCount: webhooks.length
      });
    } catch (error) {
      logger.error('Error sending webhook notifications', {
        error,
        merchantId,
        event
      });
    }
  }

  private generateSignature(payload: any, secret: string): string {
    return createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private async sendHttpRequest(webhook: any, payload: any, signature: string) {
    try {
      await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        timeout: 5000 // 5 segundos timeout
      });

      // Atualizar último envio bem sucedido
      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          failure_count: 0
        })
        .eq('id', webhook.id);

    } catch (error) {
      // Incrementar contador de falhas
      await supabase
        .from('webhooks')
        .update({
          failure_count: webhook.failure_count + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', webhook.id);

      logger.error('Failed to send webhook', {
        error,
        webhookId: webhook.id,
        url: webhook.url
      });
    }
  }
}
