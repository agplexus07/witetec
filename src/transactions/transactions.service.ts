import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { 
  CreateTransactionDto, 
  UpdateTransactionStatusDto,
  TransactionListQueryDto,
  CreatePixDto,
  CheckPixStatusDto
} from './dto/transaction.dto';
import { PixService } from '../pix/pix.service';
import { WebhookSenderService } from '../webhooks/webhook-sender.service';
import { logger } from '../config/logger.config';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionsService {
  private readonly ONZ_PIX_KEY = '45e3ded3-e1cf-432c-99c3-11533a5fd7fe';

  constructor(
    private readonly pixService: PixService,
    private readonly webhookSenderService: WebhookSenderService
  ) {}

  async getMerchantTransactions(merchantId: string, query: TransactionListQueryDto) {
    try {
      let dbQuery = supabase
        .from('transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (query.start_date) {
        dbQuery = dbQuery.gte('created_at', query.start_date);
      }

      if (query.end_date) {
        dbQuery = dbQuery.lte('created_at', query.end_date);
      }

      if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      const transactions = data?.map(tx => ({
        id: tx.id,
        transaction_id: tx.transaction_id,
        amount: tx.amount,
        status: tx.status,
        created_at: tx.created_at,
        paid_at: tx.paid_at,
        expires_at: tx.expires_at,
        description: tx.description,
        customer_name: tx.customer_info?.name || '',
        customer_document: tx.customer_info?.document || '',
        fee_amount: tx.fee_amount,
        net_amount: tx.net_amount
      })) || [];

      logger.info('Transactions retrieved', {
        merchantId,
        count: transactions.length
      });

      return {
        transactions: transactions,
        total: transactions.length
      };
    } catch (error) {
      logger.error('Error retrieving transactions', {
        error,
        merchantId
      });
      throw error;
    }
  }

  async createPixTransaction(data: CreatePixDto, merchantId: string) {
    try {
      logger.info('Starting PIX transaction creation', {
        amount: data.amount,
        description: data.description,
        hasPayerInfo: !!data.payer_info,
        merchantId
      });

      const transactionId = randomUUID();
      logger.info('Generated transaction ID', { transactionId });

      const { data: merchant } = await supabase
        .from('merchants')
        .select('fee_type, fee_amount, fee_percentage')
        .eq('id', merchantId)
        .single();

      if (!merchant) {
        throw new BadRequestException('Comerciante não encontrado');
      }

      let feeAmount = 0;
      if (merchant.fee_type === 'fixed') {
        feeAmount = (merchant.fee_amount || 0) / 100;
      } else {
        feeAmount = (data.amount * (merchant.fee_percentage || 0)) / 100;
      }

      const netAmount = data.amount - feeAmount;

      const pixCharge = await this.pixService.createPixCharge({
        amount: data.amount,
        transactionId,
        description: data.description || 'Pagamento PIX',
        customerInfo: data.payer_info,
        merchantId
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([
          {
            merchant_id: merchantId,
            transaction_id: transactionId,
            amount: data.amount,
            fee_amount: feeAmount,
            net_amount: netAmount,
            status: 'pending',
            description: data.description,
            customer_info: data.payer_info,
            expires_at: expiresAt.toISOString(),
            pix_data: {
              qr_code: pixCharge.qrCode,
              payment_link: pixCharge.paymentLinkUrl,
              expires_at: expiresAt.toISOString()
            },
            pix_key: this.ONZ_PIX_KEY
          }
        ])
        .select()
        .single();

      if (error) throw error;

      logger.info('PIX transaction created successfully', {
        transactionId,
        merchantId,
        amount: data.amount,
        feeAmount,
        expiresAt
      });

      await this.webhookSenderService.sendWebhookNotification(
        merchantId,
        'payment.created',
        {
          transaction_id: transactionId,
          amount: data.amount,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          pix: {
            qr_code: pixCharge.qrCode,
            payment_link: pixCharge.paymentLinkUrl
          }
        }
      );

      return {
        transaction_id: transactionId,
        amount: data.amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        pix: {
          qr_code: pixCharge.qrCode,
          payment_link: pixCharge.paymentLinkUrl,
          expires_at: expiresAt.toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in PIX transaction creation', {
        error: {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          stack: error.stack,
        },
        amount: data.amount,
        description: data.description,
        merchantId
      });
      throw error;
    }
  }

  async checkPixStatus(txid: string) {
    try {
      logger.info('Checking PIX status', { txid });

      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', txid)
        .single();

      if (error || !transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      const pixStatus = await this.pixService.getPixStatus(txid);

      if (pixStatus.status !== transaction.status) {
        await this.updateTransactionStatus(transaction.id, {
          status: pixStatus.status
        });

        if (pixStatus.status === 'completed') {
          await this.webhookSenderService.sendWebhookNotification(
            transaction.merchant_id,
            'payment.success',
            {
              transaction_id: txid,
              amount: transaction.amount,
              status: pixStatus.status,
              paid_at: pixStatus.paidAt,
              payer_info: transaction.payer_info
            }
          );
        } else if (pixStatus.status === 'failed') {
          await this.webhookSenderService.sendWebhookNotification(
            transaction.merchant_id,
            'payment.failed',
            {
              transaction_id: txid,
              amount: transaction.amount,
              status: pixStatus.status
            }
          );
        }
      }

      logger.info('PIX status checked', {
        txid,
        status: pixStatus.status,
        paidAmount: pixStatus.paidAmount,
        paidAt: pixStatus.paidAt
      });

      return {
        transaction_id: txid,
        status: pixStatus.status,
        amount: transaction.amount,
        paid_amount: pixStatus.paidAmount,
        paid_at: pixStatus.paidAt,
        end_to_end_id: transaction.end_to_end_id
      };
    } catch (error) {
      logger.error('Error checking PIX status', {
        error,
        txid
      });
      throw error;
    }
  }

  async updateTransactionStatus(id: string, data: UpdateTransactionStatusDto) {
    try {
      const { data: currentTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentTransaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (['completed', 'failed', 'expired'].includes(currentTransaction.status)) {
        throw new BadRequestException('Transação já está em estado final');
      }

      // Primeiro atualizamos o status da transação
      const { data: transaction, error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: data.status,
          updated_at: new Date().toISOString(),
          paid_at: data.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Se a transação foi completada, atualizamos o saldo do comerciante
      if (data.status === 'completed' && currentTransaction.status !== 'completed') {
        logger.info('Atualizando saldo do comerciante', {
          merchantId: currentTransaction.merchant_id,
          amount: currentTransaction.net_amount
        });

        // Usar RPC para atualizar o saldo de forma atômica
        const { error: balanceError } = await supabase.rpc('update_merchant_balance', {
          p_merchant_id: currentTransaction.merchant_id,
          p_amount: currentTransaction.net_amount
        });

        if (balanceError) {
          logger.error('Erro ao atualizar saldo do comerciante', {
            error: balanceError,
            merchantId: currentTransaction.merchant_id,
            amount: currentTransaction.net_amount
          });
          throw balanceError;
        }

        // Enviar webhook de sucesso
        await this.webhookSenderService.sendWebhookNotification(
          transaction.merchant_id,
          'payment.success',
          {
            transaction_id: transaction.transaction_id,
            amount: transaction.amount,
            status: transaction.status,
            paid_at: transaction.paid_at,
            payer_info: transaction.payer_info
          }
        );

        logger.info('Transação completada e saldo atualizado', {
          transactionId: id,
          merchantId: transaction.merchant_id,
          amount: transaction.net_amount
        });
      } else if (data.status === 'failed' && currentTransaction.status !== 'failed') {
        await this.webhookSenderService.sendWebhookNotification(
          transaction.merchant_id,
          'payment.failed',
          {
            transaction_id: transaction.transaction_id,
            amount: transaction.amount,
            status: transaction.status
          }
        );

        logger.info('Transação falhou', {
          transactionId: id,
          merchantId: transaction.merchant_id
        });
      }

      return transaction;
    } catch (error) {
      logger.error('Error updating transaction status', {
        error,
        transactionId: id,
        status: data.status
      });
      throw error;
    }
  }

  async getTransactionDetails(id: string) {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(`
          *,
          merchants (
            company_name,
            trading_name,
            cnpj
          )
        `)
        .eq('id', id)
        .single();

      if (error || !transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      logger.info('Transaction details retrieved', {
        transactionId: id,
        status: transaction.status
      });

      return transaction;
    } catch (error) {
      logger.error('Error retrieving transaction details', {
        error,
        transactionId: id
      });
      throw error;
    }
  }
}
