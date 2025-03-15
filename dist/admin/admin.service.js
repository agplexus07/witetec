"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../config/supabase.config");
let AdminService = class AdminService {
    async getAllMerchants() {
        const { data, error } = await supabase_config_1.supabase
            .from('merchants')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getMerchantDetails(merchantId) {
        const { data: merchant, error: merchantError } = await supabase_config_1.supabase
            .from('merchants')
            .select('*')
            .eq('id', merchantId)
            .single();
        if (merchantError || !merchant) {
            throw new common_1.NotFoundException('Comerciante não encontrado');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: transactions } = await supabase_config_1.supabase
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
    async updateMerchantFee(merchantId, data) {
        const { data: merchant, error } = await supabase_config_1.supabase
            .from('merchants')
            .update({ fee_percentage: data.fee_percentage })
            .eq('id', merchantId)
            .select()
            .single();
        if (error)
            throw error;
        return merchant;
    }
    async updateMerchantStatus(merchantId, data) {
        const { data: merchant, error } = await supabase_config_1.supabase
            .from('merchants')
            .update({
            status: data.status,
            ...(data.rejection_reason && { rejection_reason: data.rejection_reason }),
        })
            .eq('id', merchantId)
            .select()
            .single();
        if (error)
            throw error;
        return merchant;
    }
    async getChargebacks(dateRange) {
        let query = supabase_config_1.supabase
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
        if (error)
            throw error;
        return data;
    }
    async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayTransactions } = await supabase_config_1.supabase
            .from('transactions')
            .select('amount, fee_amount')
            .gte('created_at', today.toISOString())
            .eq('status', 'completed');
        const { data: chargebacks } = await supabase_config_1.supabase
            .from('transactions')
            .select('amount')
            .eq('status', 'chargeback');
        const { data: pendingMerchants } = await supabase_config_1.supabase
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)()
], AdminService);
//# sourceMappingURL=admin.service.js.map