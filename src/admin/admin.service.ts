import { Injectable, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { 
  UpdateMerchantFeeDto, 
  UpdateMerchantStatusDto, 
  DateRangeDto,
  MerchantRevenueFilterDto,
  AdminMetricsDto,
  MerchantRevenueDto,
  UpdateDocumentStatusDto,
  UpdateDocumentsStatusDto
} from './dto/admin.dto';
import { UpdateWithdrawalStatusDto } from '../withdrawals/dto/withdrawal.dto';
import { logger } from '../config/logger.config';

@Injectable()
export class AdminService {
  async getAdminMetrics(): Promise<AdminMetricsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const metrics: AdminMetricsDto = {
      today_volume: 0,
      last_30_days_volume: 0,
      chargeback_rate: 0,
      total_transactions: transactions?.length || 0,
      successful_transactions: 0,
      total_chargebacks: 0
    };

    if (transactions?.length) {
      transactions.forEach(tx => {
        if (tx.status === 'completed') {
          metrics.successful_transactions++;
          metrics.last_30_days_volume += tx.amount;

          const txDate = new Date(tx.created_at);
          if (txDate >= today) {
            metrics.today_volume += tx.amount;
          }
        } else if (tx.status === 'chargeback') {
          metrics.total_chargebacks++;
        }
      });

      // Calcular taxa de chargeback
      metrics.chargeback_rate = (metrics.total_chargebacks / metrics.total_transactions) * 100;
    }

    return metrics;
  }

  async getMerchantRevenueDetails(): Promise<MerchantRevenueDto[]> {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        merchants (
          company_name
        )
      `)
      .eq('status', 'completed');

    if (error) throw error;

    const merchantRevenue = new Map<string, MerchantRevenueDto>();

    transactions?.forEach(tx => {
      const merchantId = tx.merchant_id;
      const current = merchantRevenue.get(merchantId) || {
        merchant_name: tx.merchants.company_name,
        total_volume: 0,
        total_revenue: 0,
        total_transactions: 0,
        average_ticket: 0
      };

      current.total_volume += tx.amount;
      current.total_revenue += tx.fee_amount;
      current.total_transactions++;

      merchantRevenue.set(merchantId, current);
    });

    // Calcular ticket médio
    for (const revenue of merchantRevenue.values()) {
      revenue.average_ticket = revenue.total_volume / revenue.total_transactions;
    }

    return Array.from(merchantRevenue.values());
  }

  async getAllMerchants() {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getMerchantDetails(merchantId: string) {
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      throw new NotFoundException('Comerciante não encontrado');
    }

    // Buscar estatísticas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, status, created_at')
      .eq('merchant_id', merchantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const stats = {
      today_volume: 0,
      thirty_days_volume: 0,
      chargeback_count: 0,
      available_balance: merchant.balance,
    };

    transactions?.forEach(tx => {
      const txDate = new Date(tx.created_at);
      if (txDate >= today) {
        stats.today_volume += tx.amount;
      }
      stats.thirty_days_volume += tx.amount;
      if (tx.status === 'chargeback') {
        stats.chargeback_count++;
      }
    });

    return {
      merchant,
      stats,
    };
  }

  async updateMerchantFee(merchantId: string, data: UpdateMerchantFeeDto) {
    const updateData: any = {
      fee_type: data.fee_type
    };

    if (data.fee_type === 'fixed') {
      updateData.fee_amount = data.fee_amount;
      updateData.fee_percentage = null;
    } else {
      updateData.fee_percentage = data.fee_percentage;
      updateData.fee_amount = null;
    }

    const { data: merchant, error } = await supabase
      .from('merchants')
      .update(updateData)
      .eq('id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return merchant;
  }

  async updateMerchantStatus(merchantId: string, data: UpdateMerchantStatusDto) {
    const updateData: any = {
      status: data.status,
      fee_type: data.fee_type,
      ...(data.rejection_reason && { rejection_reason: data.rejection_reason }),
    };

    if (data.fee_type === 'fixed') {
      updateData.fee_amount = data.fee_amount;
      updateData.fee_percentage = null;
    } else {
      updateData.fee_percentage = data.fee_percentage;
      updateData.fee_amount = null;
    }

    const { data: merchant, error } = await supabase
      .from('merchants')
      .update(updateData)
      .eq('id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return merchant;
  }

  async getMerchantDocuments(merchantId: string) {
    const { data, error } = await supabase
      .from('merchant_documents')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateDocumentStatus(merchantId: string, documentId: string, data: UpdateDocumentStatusDto) {
    try {
      const { data: document, error: updateError } = await supabase
        .from('merchant_documents')
        .update({
          status: data.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: data.rejection_reason
        })
        .eq('id', documentId)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Verificar se todos os documentos foram aprovados
      const { data: documents } = await supabase
        .from('merchant_documents')
        .select('status')
        .eq('merchant_id', merchantId);

      const allApproved = documents?.every(doc => doc.status === 'approved');

      if (allApproved) {
        await supabase
          .from('merchants')
          .update({
            documents_verified: true,
            documents_verified_at: new Date().toISOString(),
            documents_verified_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', merchantId);
      }

      logger.info('Document status updated', {
        merchantId,
        documentId,
        status: data.status
      });

      return document;
    } catch (error) {
      logger.error('Error updating document status', {
        error,
        merchantId,
        documentId
      });
      throw error;
    }
  }

  async updateDocumentsStatus(merchantId: string, data: UpdateDocumentsStatusDto) {
    try {
      const { data: documents, error: updateError } = await supabase
        .from('merchant_documents')
        .update({
          status: data.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: data.rejection_reason
        })
        .in('id', data.document_ids)
        .eq('merchant_id', merchantId)
        .select();

      if (updateError) throw updateError;

      // Verificar se todos os documentos foram aprovados
      const { data: allDocuments } = await supabase
        .from('merchant_documents')
        .select('status')
        .eq('merchant_id', merchantId);

      const allApproved = allDocuments?.every(doc => doc.status === 'approved');

      if (allApproved) {
        await supabase
          .from('merchants')
          .update({
            documents_verified: true,
            documents_verified_at: new Date().toISOString(),
            documents_verified_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', merchantId);
      }

      logger.info('Multiple documents status updated', {
        merchantId,
        documentIds: data.document_ids,
        status: data.status
      });

      return documents;
    } catch (error) {
      logger.error('Error updating multiple documents status', {
        error,
        merchantId,
        documentIds: data.document_ids
      });
      throw error;
    }
  }

  async getChargebacks(dateRange?: DateRangeDto) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        merchants (
          company_name,
          trading_name,
          cnpj
        )
      `)
      .eq('status', 'chargeback');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start_date)
        .lte('created_at', dateRange.end_date);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getDashboardStats(dateRange: DateRangeDto) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, fee_amount, status, created_at')
      .gte('created_at', dateRange.start_date)
      .lte('created_at', dateRange.end_date);

    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, status')
      .eq('status', 'pending');

    const stats = {
      total_volume: 0,
      total_revenue: 0,
      total_transactions: 0,
      completed_transactions: 0,
      failed_transactions: 0,
      chargeback_count: 0,
      success_rate: 0,
      pending_merchants: merchants?.length || 0,
    };

    transactions?.forEach(tx => {
      stats.total_transactions++;
      
      if (tx.status === 'completed') {
        stats.total_volume += tx.amount;
        stats.total_revenue += tx.fee_amount;
        stats.completed_transactions++;
      } else if (tx.status === 'failed') {
        stats.failed_transactions++;
      } else if (tx.status === 'chargeback') {
        stats.chargeback_count++;
      }
    });

    if (stats.total_transactions > 0) {
      stats.success_rate = (stats.completed_transactions / stats.total_transactions) * 100;
    }

    return stats;
  }

  async getMerchantsRevenue(filter: MerchantRevenueFilterDto) {
    let query = supabase
      .from('transactions')
      .select(`
        merchant_id,
        amount,
        fee_amount,
        status,
        created_at,
        merchants:merchant_id (
          id,
          company_name,
          trading_name,
          cnpj
        )
      `)
      .eq('status', 'completed')
      .gte('created_at', filter.start_date)
      .lte('created_at', filter.end_date);

    if (filter.merchant_id) {
      query = query.eq('merchant_id', filter.merchant_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Agrupar por comerciante
    const revenueByMerchant = data.reduce((acc: any, tx: any) => {
      const merchantId = tx.merchant_id;
      const merchant = tx.merchants;
      
      if (!acc[merchantId]) {
        acc[merchantId] = {
          merchant,
          total_volume: 0,
          total_revenue: 0,
          transaction_count: 0,
          average_ticket: 0
        };
      }

      acc[merchantId].total_volume += tx.amount;
      acc[merchantId].total_revenue += tx.fee_amount;
      acc[merchantId].transaction_count++;
      
      return acc;
    }, {});

    // Calcular média de ticket
    Object.values(revenueByMerchant).forEach((stats: any) => {
      if (stats.transaction_count > 0) {
        stats.average_ticket = stats.total_volume / stats.transaction_count;
      }
    });

    return Object.values(revenueByMerchant);
  }

  async getPendingWithdrawals() {
    const { data, error } = await supabase
      .from('withdrawals')
      .select(`
        *,
        merchants (
          company_name,
          trading_name,
          cnpj
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateWithdrawalStatus(id: string, data: UpdateWithdrawalStatusDto) {
    const { data: withdrawal, error: getError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !withdrawal) {
      throw new NotFoundException('Saque não encontrado');
    }

    if (withdrawal.status !== 'pending') {
      throw new NotFoundException('Este saque já foi processado');
    }

    const { data: updated, error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: data.status,
        processed_at: new Date().toISOString(),
        rejection_reason: data.rejection_reason
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Se aprovado, deduzir do saldo do comerciante
    if (data.status === 'approved') {
      const totalDeduction = withdrawal.amount + withdrawal.fee_amount;
      await this.updateMerchantBalance(withdrawal.merchant_id, -totalDeduction);
    }

    return updated;
  }

  private async updateMerchantBalance(merchantId: string, amount: number) {
    const { error } = await supabase.rpc('update_merchant_balance', {
      p_merchant_id: merchantId,
      p_amount: amount,
    });

    if (error) throw error;
  }
}