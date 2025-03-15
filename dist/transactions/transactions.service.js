"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../config/supabase.config");
let TransactionsService = class TransactionsService {
    async createTransaction(data) {
        const { data: merchant } = await supabase_config_1.supabase
            .from('merchants')
            .select('fee_percentage')
            .eq('id', data.merchant_id)
            .single();
        if (!merchant) {
            throw new common_1.BadRequestException('Comerciante não encontrado');
        }
        const feeAmount = (data.amount * merchant.fee_percentage) / 100;
        const netAmount = data.amount - feeAmount;
        const { data: transaction, error } = await supabase_config_1.supabase
            .from('transactions')
            .insert([
            {
                ...data,
                fee_amount: feeAmount,
                net_amount: netAmount,
                status: 'pending',
            },
        ])
            .select()
            .single();
        if (error)
            throw error;
        return transaction;
    }
    async updateTransactionStatus(id, data) {
        const { data: transaction, error } = await supabase_config_1.supabase
            .from('transactions')
            .update({ status: data.status })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        if (data.status === 'completed') {
            await this.updateMerchantBalance(transaction.merchant_id, transaction.net_amount);
        }
        return transaction;
    }
    async updateMerchantBalance(merchantId, amount) {
        const { error } = await supabase_config_1.supabase.rpc('update_merchant_balance', {
            p_merchant_id: merchantId,
            p_amount: amount,
        });
        if (error)
            throw error;
    }
    async getMerchantTransactions(merchantId) {
        const { data, error } = await supabase_config_1.supabase
            .from('transactions')
            .select('*')
            .eq('merchant_id', merchantId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)()
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map