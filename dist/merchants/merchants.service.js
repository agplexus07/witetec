"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../config/supabase.config");
const logger_config_1 = require("../config/logger.config");
let MerchantsService = class MerchantsService {
    async register(merchantData) {
        try {
            const { data: { user }, error: authError } = await supabase_config_1.supabase.auth.getUser();
            if (authError || !user) {
                throw new common_1.BadRequestException('Usuário não autenticado');
            }
            const { data, error } = await supabase_config_1.supabase
                .from('merchants')
                .insert([{
                    ...merchantData,
                    id: user.id
                }])
                .select()
                .single();
            if (error)
                throw error;
            logger_config_1.logger.info('New merchant registered', {
                merchantId: data.id,
                companyName: data.company_name
            });
            return data;
        }
        catch (error) {
            logger_config_1.logger.error('Error registering merchant', {
                error,
                merchantData
            });
            throw error;
        }
    }
    async getMerchantById(id) {
        try {
            const { data, error } = await supabase_config_1.supabase
                .from('merchants')
                .select('*')
                .eq('id', id)
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            logger_config_1.logger.error('Error fetching merchant', {
                error,
                merchantId: id
            });
            throw error;
        }
    }
    async updateMerchantStatus(id, status, rejectionReason) {
        try {
            const { data, error } = await supabase_config_1.supabase
                .from('merchants')
                .update({
                status,
                ...(rejectionReason && { rejection_reason: rejectionReason })
            })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            logger_config_1.logger.info('Merchant status updated', {
                merchantId: id,
                status,
                rejectionReason
            });
            return data;
        }
        catch (error) {
            logger_config_1.logger.error('Error updating merchant status', {
                error,
                merchantId: id,
                status
            });
            throw error;
        }
    }
    async updateMerchantFee(id, feePercentage) {
        try {
            const { data, error } = await supabase_config_1.supabase
                .from('merchants')
                .update({ fee_percentage: feePercentage })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            logger_config_1.logger.info('Merchant fee updated', {
                merchantId: id,
                feePercentage
            });
            return data;
        }
        catch (error) {
            logger_config_1.logger.error('Error updating merchant fee', {
                error,
                merchantId: id,
                feePercentage
            });
            throw error;
        }
    }
    async uploadDocument(merchantId, documentType, file) {
        try {
            const fileName = `${merchantId}/${documentType}_${Date.now()}${this.getFileExtension(file.originalname)}`;
            const { data: uploadData, error: uploadError } = await supabase_config_1.supabase
                .storage
                .from('merchant-documents')
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });
            if (uploadError)
                throw uploadError;
            const { data: currentMerchant } = await supabase_config_1.supabase
                .from('merchants')
                .select('document_urls')
                .eq('id', merchantId)
                .single();
            const { data: merchant, error: updateError } = await supabase_config_1.supabase
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
            if (updateError)
                throw updateError;
            logger_config_1.logger.info('Document uploaded successfully', {
                merchantId,
                documentType,
                fileName
            });
            return merchant;
        }
        catch (error) {
            logger_config_1.logger.error('Error uploading document', {
                error,
                merchantId,
                documentType
            });
            throw error;
        }
    }
    async getDashboardStats(merchantId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: transactions, error: txError } = await supabase_config_1.supabase
                .from('transactions')
                .select('*')
                .eq('merchant_id', merchantId)
                .gte('created_at', thirtyDaysAgo.toISOString());
            if (txError)
                throw txError;
            const { data: merchant, error: merchantError } = await supabase_config_1.supabase
                .from('merchants')
                .select('balance')
                .eq('id', merchantId)
                .single();
            if (merchantError)
                throw merchantError;
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
            logger_config_1.logger.info('Dashboard stats calculated', {
                merchantId,
                stats
            });
            return stats;
        }
        catch (error) {
            logger_config_1.logger.error('Error calculating dashboard stats', {
                error,
                merchantId
            });
            throw error;
        }
    }
    getFileExtension(filename) {
        return filename.substring(filename.lastIndexOf('.'));
    }
};
exports.MerchantsService = MerchantsService;
exports.MerchantsService = MerchantsService = __decorate([
    (0, common_1.Injectable)()
], MerchantsService);
//# sourceMappingURL=merchants.service.js.map