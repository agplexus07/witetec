import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { randomBytes, createHmac } from 'crypto';
import { logger } from '../config/logger.config';

@Injectable()
export class ApiKeysService {
  async getAllApiKeys() {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createApiKey(data: CreateApiKeyDto) {
    try {
      // Verificar se o comerciante existe e está aprovado
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('status, documents_status')
        .eq('id', data.merchant_id)
        .single();

      if (merchantError || !merchant) {
        logger.error('Merchant not found', { 
          merchantId: data.merchant_id,
          error: merchantError 
        });
        throw new BadRequestException('Comerciante não encontrado');
      }

      if (merchant.status !== 'approved' || merchant.documents_status !== 'approved') {
        logger.error('Merchant cannot generate API keys', { 
          merchantId: data.merchant_id,
          status: merchant.status,
          documentsStatus: merchant.documents_status
        });
        throw new BadRequestException('Envie os documentos e aguarde a aprovação para gerar chaves de API');
      }

      // Gerar chaves
      const apiKey = `pk_${randomBytes(24).toString('hex')}`;
      const secretKey = `sk_${randomBytes(24).toString('hex')}`;

      const { data: apiKeyData, error } = await supabase
        .from('api_keys')
        .insert([
          {
            merchant_id: data.merchant_id,
            key_name: data.key_name,
            api_key: apiKey,
            secret_key: secretKey,
            test_mode: data.test_mode || false,
            webhook_url: data.webhook_url,
            expires_at: data.expires_at,
          },
        ])
        .select()
        .single();

      if (error) {
        logger.error('Error creating API key', { error });
        throw new BadRequestException('Erro ao criar chave de API');
      }

      logger.info('API key created successfully', {
        merchantId: data.merchant_id,
        keyName: data.key_name
      });

      return {
        ...apiKeyData,
        api_key: apiKey,
        secret_key: secretKey,
      };
    } catch (error) {
      logger.error('Error in createApiKey', {
        error,
        merchantId: data.merchant_id
      });
      throw error;
    }
  }

  async getMerchantApiKeys(merchantId: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async revokeApiKey(id: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('is_active, expires_at')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) return false;

    // Verificar se a chave está ativa e não expirou
    if (!data.is_active) return false;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return false;

    // Atualizar último uso
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey);

    return true;
  }

  async getMerchantIdFromApiKey(apiKey: string): Promise<string> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('merchant_id')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      throw new BadRequestException('Chave de API inválida');
    }

    return data.merchant_id;
  }

  generateWebhookSignature(payload: any, secretKey: string): string {
    const hmac = createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
}