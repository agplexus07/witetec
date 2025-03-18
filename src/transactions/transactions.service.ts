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
import { logger } from '../config/logger.config';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionsService {
  constructor(private readonly pixService: PixService) {}

  async createPixTransaction(data: CreatePixDto, merchantId: string) {
    try {
      logger.info('Starting PIX transaction creation', {
        amount: data.amount,
        description: data.description,
        hasPayerInfo: !!data.payer_info,
        merchantId
      });

      // Gerar ID único para a transação
      const transactionId = randomUUID();
      logger.info('Generated transaction ID', { transactionId });

      // Buscar configuração de taxa do comerciante
      const { data: merchant } = await supabase
        .from('merchants')
        .select('fee_type, fee_amount, fee_percentage')
        .eq('id', merchantId)
        .single();

      if (!merchant) {
        throw new BadRequestException('Comerciante não encontrado');
      }

      // Calcular taxa baseado no tipo (fixo ou percentual)
      let feeAmount = 0;
      if (merchant.fee_type === 'fixed') {
        feeAmount = (merchant.fee_amount || 0) / 100; // Converter centavos para reais
      } else {
        feeAmount = (data.amount * (merchant.fee_percentage || 0)) / 100;
      }

      const netAmount = data.amount - feeAmount;

      // Gerar cobrança PIX usando o serviço ONZ
      const pixCharge = await this.pixService.createPixCharge({
        amount: data.amount,
        transactionId,
        description: data.description || 'Pagamento PIX',
        customerInfo: data.payer_info,
        merchantId
      });

      // Calcular data de expiração (1 hora a partir de agora)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Salvar transação no banco
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
            }
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

      // Buscar transação no banco
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', txid)
        .single();

      if (error || !transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      // Consultar status na ONZ
      const pixStatus = await this.pixService.getPixStatus(txid);

      // Se o status mudou, atualizar no banco
      if (pixStatus.status !== transaction.status) {
        await this.updateTransactionStatus(transaction.id, {
          status: pixStatus.status
        });
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
      // Buscar transação atual
      const { data: currentTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentTransaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      // Verificar se já não está em um estado final
      if (['completed', 'failed'].includes(currentTransaction.status)) {
        throw new BadRequestException('Transação já está em estado final');
      }

      // Se a transação estiver expirada mas recebemos confirmação de pagamento, permitir a atualização
      if (currentTransaction.status === 'expired' && data.status !== 'completed') {
        throw new BadRequestException('Transação expirada não pode ser atualizada');
      }

      // Atualizar status
      const { data: transaction, error } = await supabase
        .from('transactions')
        .update({ 
          status: data.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Se a transação foi completada, atualizar o saldo do comerciante
      if (data.status === 'completed' && currentTransaction.status !== 'completed') {
        await this.updateMerchantBalance(transaction.merchant_id, transaction.net_amount);
        logger.info('Merchant balance updated after successful transaction', {
          merchantId: transaction.merchant_id,
          amount: transaction.net_amount
        });
      }

      logger.info('Transaction status updated', {
        transactionId: id,
        oldStatus: currentTransaction.status,
        newStatus: data.status
      });

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

  async getMerchantTransactions(merchantId: string, query: TransactionListQueryDto) {
    try {
      let dbQuery = supabase
        .from('transactions')
        .select('id, created_at, customer_info, amount, status, expires_at, end_to_end_id, paid_at, payer_info')
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

      logger.info('Transactions retrieved', {
        merchantId,
        count: data?.length
      });

      return data;
    } catch (error) {
      logger.error('Error retrieving transactions', {
        error,
        merchantId
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

  private async updateMerchantBalance(merchantId: string, amount: number) {
    const { error } = await supabase.rpc('update_merchant_balance', {
      p_merchant_id: merchantId,
      p_amount: amount,
    });

    if (error) throw error;
  }
}