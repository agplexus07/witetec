import { Injectable, BadRequestException } from '@nestjs/common';
import { onzClient } from '../config/onz.config';
import { logger } from '../config/logger.config';

@Injectable()
export class PixService {
  async createPixCharge(data: {
    amount: number;
    transactionId: string;
    description?: string;
    customerInfo?: Record<string, any>;
    merchantId?: string;
  }) {
    try {
      logger.info('Starting PIX charge creation', {
        transactionId: data.transactionId,
        amount: data.amount,
        description: data.description,
        merchantId: data.merchantId,
        customerInfo: data.customerInfo
      });

      // Get access token first
      const accessToken = await onzClient.getAccessToken();
      if (!accessToken) {
        logger.error('Failed to obtain access token');
        throw new Error('Não foi possível obter o token de acesso');
      }

      logger.debug('Access token obtained successfully');

      // Create PIX charge with access token
      const pixCharge = await onzClient.pix.create({
        amount: data.amount,
        correlationID: data.transactionId,
        description: data.description || 'Pagamento PIX',
        expiresIn: 3600, // 1 hora
        customerInfo: data.customerInfo
      });

      logger.info('PIX charge created successfully', {
        transactionId: data.transactionId,
        amount: data.amount,
        qrCode: !!pixCharge.qrCode,
        qrCodeImage: !!pixCharge.qrCodeImage,
        paymentLinkUrl: !!pixCharge.paymentLinkUrl,
        expiresAt: pixCharge.expiresAt
      });

      return {
        qrCode: pixCharge.qrCode,
        qrCodeImage: pixCharge.qrCodeImage,
        paymentLinkUrl: pixCharge.paymentLinkUrl,
        expiresAt: pixCharge.expiresAt
      };
    } catch (error) {
      logger.error('Error creating PIX charge', {
        error: {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          stack: error.stack,
        },
        requestData: {
          transactionId: data.transactionId,
          amount: data.amount,
          description: data.description,
          merchantId: data.merchantId
        }
      });
      throw new BadRequestException(`Erro ao gerar cobrança PIX: ${error.message}`);
    }
  }

  async getPixStatus(transactionId: string) {
    try {
      logger.info('Checking PIX status', { transactionId });

      // Get access token first
      const accessToken = await onzClient.getAccessToken();
      if (!accessToken) {
        logger.error('Failed to obtain access token for status check');
        throw new Error('Não foi possível obter o token de acesso');
      }

      logger.debug('Access token obtained for status check');

      const pixStatus = await onzClient.pix.status(transactionId);

      logger.info('PIX status retrieved', {
        transactionId,
        status: pixStatus.status,
        paidAmount: pixStatus.paidAmount,
        paidAt: pixStatus.paidAt
      });

      return pixStatus;
    } catch (error) {
      logger.error('Error checking PIX status', {
        error: {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          stack: error.stack,
        },
        transactionId
      });
      throw error;
    }
  }

  async getReceivedPix(params: {
    startDate: Date;
    endDate: Date;
    txid?: string;
    cpf?: string;
    cnpj?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      logger.info('Getting received PIX', { params });

      const accessToken = await onzClient.getAccessToken();
      if (!accessToken) {
        throw new Error('Não foi possível obter o token de acesso');
      }

      const receivedPix = await onzClient.pix.listReceived({
        inicio: params.startDate.toISOString(),
        fim: params.endDate.toISOString(),
        txid: params.txid,
        cpf: params.cpf,
        cnpj: params.cnpj,
        paginacao: {
          paginaAtual: params.page || 0,
          itensPorPagina: params.pageSize || 100
        }
      });

      logger.info('Received PIX list retrieved', {
        count: receivedPix.length,
        startDate: params.startDate,
        endDate: params.endDate
      });

      return receivedPix;
    } catch (error) {
      logger.error('Error getting received PIX', {
        error: {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          stack: error.stack
        },
        params
      });
      throw error;
    }
  }

  async getPixDetails(e2eid: string) {
    try {
      logger.info('Getting PIX details', { e2eid });

      const accessToken = await onzClient.getAccessToken();
      if (!accessToken) {
        throw new Error('Não foi possível obter o token de acesso');
      }

      const pixDetails = await onzClient.pix.get(e2eid);

      logger.info('PIX details retrieved', {
        e2eid,
        txid: pixDetails.txid,
        valor: pixDetails.valor
      });

      return pixDetails;
    } catch (error) {
      logger.error('Error getting PIX details', {
        error: {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          stack: error.stack
        },
        e2eid
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
      logger.info('Starting PIX refund', {
        transactionId: data.transactionId,
        amount: data.amount,
        reason: data.reason
      });

      // Get access token first
      const accessToken = await onzClient.getAccessToken();
      if (!accessToken) {
        logger.error('Failed to obtain access token for refund');
        throw new Error('Não foi possível obter o token de acesso');
      }

      logger.debug('Access token obtained for refund');

      const refund = await onzClient.pix.refund({
        correlationID: data.transactionId,
        amount: data.amount,
        reason: data.reason || 'Reembolso solicitado'
      });

      logger.info('PIX refund created successfully', {
        transactionId: data.transactionId,
        refundId: refund.id,
        amount: data.amount,
        status: refund.status
      });

      return refund;
    } catch (error) {
      logger.error('Error creating PIX refund', {
        error: {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          stack: error.stack,
        },
        transactionId: data.transactionId,
        amount: data.amount
      });
      throw error;
    }
  }
}