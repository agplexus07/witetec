import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';
import { MerchantStatisticsDto } from './dto/merchant.dto';

@Injectable()
export class MerchantsService {
  async register(merchantData: any) {
    try {
      // Criar novo usuário com email/senha
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: merchantData.email,
        password: merchantData.cnpj // Usando CNPJ como senha inicial
      });

      if (signUpError) {
        logger.error('Error creating user', {
          error: signUpError,
          email: merchantData.email
        });
        throw new BadRequestException('Erro ao criar usuário: ' + signUpError.message);
      }

      if (!authData.user) {
        throw new BadRequestException('Erro ao criar usuário');
      }

      // Remover documentos dos dados do comerciante
      const { documents, ...merchantInfo } = merchantData;

      // Criar o comerciante
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert([{
          ...merchantInfo,
          id: authData.user.id,
          fee_type: 'percentage',
          fee_percentage: 2.99
        }])
        .select()
        .single();

      if (merchantError) {
        logger.error('Error creating merchant', {
          error: merchantError,
          userId: authData.user.id
        });
        throw merchantError;
      }

      logger.info('New merchant registered', {
        merchantId: merchant.id,
        companyName: merchant.company_name
      });

      return {
        ...merchant,
        message: 'Cadastro realizado com sucesso. Aguarde a aprovação.'
      };
    } catch (error) {
      logger.error('Error registering merchant', {
        error,
        merchantData
      });
      throw error;
    }
  }

  async getMerchantById(id: string) {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error fetching merchant', {
        error,
        merchantId: id
      });
      throw error;
    }
  }

  async getMerchantStatistics(merchantId: string): Promise<MerchantStatisticsDto> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar transações
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (txError) throw txError;

      // Buscar saldo do merchant
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('balance')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;

      const stats: MerchantStatisticsDto = {
        pixToday: 0,
        pix30Days: 0,
        totalTransactions: transactions?.length || 0,
        availableBalance: merchant?.balance || 0,
        pendingBalance: 0,
        successRate: 0,
        averageTicket: 0,
        chargebackRate: 0
      };

      if (transactions?.length) {
        const successful = transactions.filter(tx => tx.status === 'completed');
        const pending = transactions.filter(tx => tx.status === 'pending');
        const chargebacks = transactions.filter(tx => tx.status === 'chargeback');
        
        // Calcular taxas
        stats.successRate = (successful.length / transactions.length) * 100;
        stats.chargebackRate = (chargebacks.length / transactions.length) * 100;
        
        // Calcular ticket médio (apenas transações completadas)
        if (successful.length > 0) {
          stats.averageTicket = successful.reduce((sum, tx) => sum + tx.amount, 0) / successful.length;
        }

        // Calcular volumes PIX
        transactions.forEach(tx => {
          if (tx.status === 'completed') {
            const txDate = new Date(tx.created_at);
            if (txDate >= today) {
              stats.pixToday += tx.amount;
            }
            stats.pix30Days += tx.amount;
          } else if (tx.status === 'pending') {
            stats.pendingBalance += tx.amount;
          }
        });
      }

      logger.info('Merchant statistics calculated', {
        merchantId,
        stats
      });

      return stats;
    } catch (error) {
      logger.error('Error calculating merchant statistics', {
        error,
        merchantId
      });
      throw error;
    }
  }

  async updateMerchantStatus(id: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .update({ 
          status,
          ...(rejectionReason && { rejection_reason: rejectionReason })
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info('Merchant status updated', {
        merchantId: id,
        status,
        rejectionReason
      });

      return data;
    } catch (error) {
      logger.error('Error updating merchant status', {
        error,
        merchantId: id,
        status
      });
      throw error;
    }
  }

  async updateMerchantFee(id: string, feePercentage: number) {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .update({ fee_percentage: feePercentage })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info('Merchant fee updated', {
        merchantId: id,
        feePercentage
      });

      return data;
    } catch (error) {
      logger.error('Error updating merchant fee', {
        error,
        merchantId: id,
        feePercentage
      });
      throw error;
    }
  }

  async getDashboardStats(merchantId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (txError) throw txError;

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('balance')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;

      const stats = {
        pixToday: 0,
        pix30Days: 0,
        totalTransactions: transactions?.length || 0,
        successRate: 0,
        averageTicket: 0,
        chargebackRate: 0,
        availableBalance: merchant?.balance || 0
      };

      if (transactions?.length) {
        const successful = transactions.filter(tx => tx.status === 'completed');
        const chargebacks = transactions.filter(tx => tx.status === 'chargeback');
        
        stats.successRate = (successful.length / transactions.length) * 100;
        stats.chargebackRate = (chargebacks.length / transactions.length) * 100;
        stats.averageTicket = successful.reduce((sum, tx) => sum + tx.amount, 0) / successful.length;

        transactions.forEach(tx => {
          if (tx.status === 'completed') {
            const txDate = new Date(tx.created_at);
            if (txDate >= today) {
              stats.pixToday += tx.amount;
            }
            stats.pix30Days += tx.amount;
          }
        });
      }

      logger.info('Dashboard stats calculated', {
        merchantId,
        stats
      });

      return stats;
    } catch (error) {
      logger.error('Error calculating dashboard stats', {
        error,
        merchantId
      });
      throw error;
    }
  }
}