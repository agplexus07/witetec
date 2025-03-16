import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';

@Injectable()
export class MerchantsService {
  async register(merchantData: any) {
    try {
      // Obter o usuário autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new BadRequestException('Usuário não autenticado');
      }

      // Adicionar o ID do usuário como ID do merchant
      const { data, error } = await supabase
        .from('merchants')
        .insert([{
          ...merchantData,
          id: user.id // Vincular o ID do usuário ao merchant
        }])
        .select()
        .single();

      if (error) throw error;

      logger.info('New merchant registered', {
        merchantId: data.id,
        companyName: data.company_name
      });

      return data;
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

  async uploadDocument(merchantId: string, documentType: string, file: Express.Multer.File) {
    try {
      const fileName = `${merchantId}/${documentType}_${Date.now()}${this.getFileExtension(file.originalname)}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('merchant-documents')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // First get current document URLs
      const { data: currentMerchant } = await supabase
        .from('merchants')
        .select('document_urls')
        .eq('id', merchantId)
        .single();

      const { data: merchant, error: updateError } = await supabase
        .from('merchants')
        .update({
          document_urls: { 
            ...(currentMerchant?.document_urls || {}), 
            [documentType]: uploadData.path 
          }
        })
        .eq('id', merchantId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info('Document uploaded successfully', {
        merchantId,
        documentType,
        fileName
      });

      return merchant;
    } catch (error) {
      logger.error('Error uploading document', {
        error,
        merchantId,
        documentType
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

  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }
}