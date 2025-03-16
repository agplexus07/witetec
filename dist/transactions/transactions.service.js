"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../config/supabase.config");
const pix_service_1 = require("../pix/pix.service");
let TransactionsService = class TransactionsService {
    pixService;
    constructor(pixService) {
        this.pixService = pixService;
    }
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
        const pixCharge = await this.pixService.createPixCharge({
            amount: data.amount,
            merchantId: data.merchant_id,
            description: data.description,
            transactionId: data.transaction_id
        });
        const { data: transaction, error } = await supabase_config_1.supabase
            .from('transactions')
            .insert([
            {
                ...data,
                fee_amount: feeAmount,
                net_amount: netAmount,
                status: 'pending',
                pix_data: {
                    qr_code: pixCharge.qrCode,
                    qr_code_image: pixCharge.qrCodeImage,
                    payment_link: pixCharge.paymentLinkUrl,
                    expires_at: pixCharge.expiresAt
                }
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
        if (data.status === 'chargeback') {
            await this.pixService.refundPix({
                transactionId: transaction.transaction_id,
                amount: transaction.amount,
                reason: 'Chargeback solicitado'
            });
        }
        return transaction;
    }
    async checkTransactionStatus(transactionId) {
        const pixStatus = await this.pixService.getPixStatus(transactionId);
        if (pixStatus.status === 'COMPLETED') {
            await this.updateTransactionStatus(transactionId, { status: 'completed' });
        }
        else if (pixStatus.status === 'EXPIRED' || pixStatus.status === 'CANCELLED') {
            await this.updateTransactionStatus(transactionId, { status: 'failed' });
        }
        return pixStatus;
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
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pix_service_1.PixService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map