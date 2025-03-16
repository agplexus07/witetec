"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PixService = void 0;
const common_1 = require("@nestjs/common");
const onz_config_1 = require("../config/onz.config");
const logger_config_1 = require("../config/logger.config");
let PixService = class PixService {
    async createPixCharge(data) {
        try {
            const pixCharge = await onz_config_1.onzClient.pix.create({
                amount: data.amount,
                correlationID: data.transactionId,
                description: data.description || 'Pagamento PIX',
                expiresIn: 3600
            });
            logger_config_1.logger.info('PIX charge created', {
                transactionId: data.transactionId,
                amount: data.amount
            });
            return {
                qrCode: pixCharge.qrCode,
                qrCodeImage: pixCharge.qrCodeImage,
                paymentLinkUrl: pixCharge.paymentLinkUrl,
                expiresAt: pixCharge.expiresAt
            };
        }
        catch (error) {
            logger_config_1.logger.error('Error creating PIX charge', {
                error,
                transactionId: data.transactionId
            });
            throw new common_1.BadRequestException('Erro ao gerar cobrança PIX');
        }
    }
    async getPixStatus(transactionId) {
        try {
            const pixStatus = await onz_config_1.onzClient.pix.status(transactionId);
            logger_config_1.logger.info('PIX status checked', {
                transactionId,
                status: pixStatus.status
            });
            return pixStatus;
        }
        catch (error) {
            logger_config_1.logger.error('Error checking PIX status', {
                error,
                transactionId
            });
            throw error;
        }
    }
    async refundPix(data) {
        try {
            const refund = await onz_config_1.onzClient.pix.refund({
                correlationID: data.transactionId,
                amount: data.amount,
                reason: data.reason || 'Reembolso solicitado'
            });
            logger_config_1.logger.info('PIX refund created', {
                transactionId: data.transactionId,
                refundId: refund.id,
                amount: data.amount
            });
            return refund;
        }
        catch (error) {
            logger_config_1.logger.error('Error creating PIX refund', {
                error,
                transactionId: data.transactionId
            });
            throw error;
        }
    }
};
exports.PixService = PixService;
exports.PixService = PixService = __decorate([
    (0, common_1.Injectable)()
], PixService);
//# sourceMappingURL=pix.service.js.map