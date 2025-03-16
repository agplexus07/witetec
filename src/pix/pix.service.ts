import { Injectable, BadRequestException } from '@nestjs/common';
import { onzClient } from '../config/onz.config';
import { logger } from '../config/logger.config';

@Injectable()
export class PixService {
  async createPixCharge(data: {
    amount: number;
    merchantId: string;
    description?: string;
    transactionId: string;
  }) {
    try {
      const pixCharge = await onzClient.pix.create({
        amount: data.amount,
        correlationID: data.transactionId,
        description: data.description || 'Pagamento PIX',
        expiresIn: 3600 // 1 hora
      });

      logger.info('PIX charge created', {
        transactionId: data.transactionId,
        amount: data.amount
      });

      return {
        qrCode: pixCharge.qrCode,
        qrCodeImage: pixCharge.qrCodeImage,
        paymentLinkUrl: pixCharge.paymentLinkUrl,
        expiresAt: pixCharge.expiresAt
      };
    } catch (error) {
      logger.error('Error creating PIX charge', {
        error,
        transactionId: data.transactionId
      });
      throw new BadRequestException('Erro ao gerar cobrança PIX');
    }
  }

  async getPixStatus(transactionId: string) {
    try {
      const pixStatus = await onzClient.pix.status(transactionId);

      logger.info('PIX status checked', {
        transactionId,
        status: pixStatus.status
      });

      return pixStatus;
    } catch (error) {
      logger.error('Error checking PIX status', {
        error,
        transactionId
      });
      throw error;
    }
  }

  async refundPix(data: {
    transactionId: string;
    amount: number;
    reason?: string;
  }) {
    try {
      const refund = await onzClient.pix.refund({
        correlationID: data.transactionId,
        amount: data.amount,
        reason: data.reason || 'Reembolso solicitado'
      });

      logger.info('PIX refund created', {
        transactionId: data.transactionId,
        refundId: refund.id,
        amount: data.amount
      });

      return refund;
    } catch (error) {
      logger.error('Error creating PIX refund', {
        error,
        transactionId: data.transactionId
      });
      throw error;
    }
  }
}