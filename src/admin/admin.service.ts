import { Injectable, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { UpdateMerchantFeeDto, UpdateMerchantStatusDto, DateRangeDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
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
    const { data: merchant, error } = await supabase
      .from('merchants')
      .update({ fee_percentage: data.fee_percentage })
      .eq('id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return merchant;
  }

  async updateMerchantStatus(merchantId: string, data: UpdateMerchantStatusDto) {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .update({
        status: data.status,
        ...(data.rejection_reason && { rejection_reason: data.rejection_reason }),
      })
      .eq('id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return merchant;
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

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTransactions } = await supabase
      .from('transactions')
      .select('amount, fee_amount')
      .gte('created_at', today.toISOString())
      .eq('status', 'completed');

    const { data: chargebacks } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'chargeback');

    const { data: pendingMerchants } = await supabase
      .from('merchants')
      .select('id')
      .eq('status', 'pending');

    return {
      today_volume: todayTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0,
      today_revenue: todayTransactions?.reduce((sum, tx) => sum + tx.fee_amount, 0) || 0,
      total_chargebacks: chargebacks?.length || 0,
      pending_merchants: pendingMerchants?.length || 0,
    };
  }
}