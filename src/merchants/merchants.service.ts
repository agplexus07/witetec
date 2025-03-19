import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';
import { CreateMerchantDto } from './dto/merchant.dto';
import { Request } from 'express';

@Injectable()
export class MerchantsService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 segundos

  async register(merchantData: CreateMerchantDto, req: Request) {
    try {
      logger.info('Iniciando registro de comerciante', {
        email: merchantData.email,
        cnpj: merchantData.cnpj
      });

      // Validar dados obrigatórios
      const requiredFields = [
        'company_name',
        'cnpj',
        'email',
        'documents'
      ];

      const missingFields = requiredFields.filter(field => !merchantData[field]);
      if (missingFields.length > 0) {
        logger.error('Campos obrigatórios faltando', { missingFields });
        throw new BadRequestException({
          code: 'MISSING_FIELDS',
          message: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
          fields: missingFields
        });
      }

      // Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new BadRequestException({
          code: 'AUTH_ERROR',
          message: 'Usuário não autenticado',
          details: userError?.message
        });
      }

      // Upload dos documentos com retentativas
      let documentUrls;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          documentUrls = await this.uploadDocuments(user.id, merchantData);
          break;
        } catch (error) {
          if (attempt === this.MAX_RETRIES) {
            logger.error('Todas as tentativas de upload falharam', {
              error,
              userId: user.id,
              attempts: attempt
            });
            throw new BadRequestException({
              code: 'UPLOAD_ERROR',
              message: 'Erro ao fazer upload dos documentos. Por favor, tente novamente.',
              details: error.message
            });
          }
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }

      // Criar o comerciante com retentativas
      let merchant;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const { data, error } = await supabase
            .from('merchants')
            .insert([{
              id: user.id,
              company_name: merchantData.company_name,
              trading_name: merchantData.trading_name,
              cnpj: merchantData.cnpj,
              email: merchantData.email,
              phone: merchantData.phone,
              address: merchantData.address,
              city: merchantData.city,
              state: merchantData.state,
              postal_code: merchantData.postal_code,
              document_urls: documentUrls,
              documents_submitted: true,
              documents_status: 'pending',
              fee_type: 'percentage',
              fee_percentage: 2.99,
              can_generate_api_key: false,
              can_withdraw: false
            }])
            .select()
            .single();

          if (error) {
            if (error.message.includes('duplicate key')) {
              throw new BadRequestException({
                code: 'CNPJ_IN_USE',
                message: 'CNPJ já cadastrado. Por favor, verifique os dados.',
                field: 'cnpj'
              });
            }
            throw error;
          }

          merchant = data;
          break;
        } catch (error) {
          if (attempt === this.MAX_RETRIES) {
            logger.error('Todas as tentativas de criar comerciante falharam', {
              error,
              userId: user.id,
              attempts: attempt
            });
            throw new BadRequestException({
              code: 'REGISTRATION_ERROR',
              message: 'Erro ao criar registro do comerciante. Por favor, tente novamente.',
              details: error.message
            });
          }
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }

      logger.info('Comerciante registrado com sucesso', {
        merchantId: merchant.id,
        companyName: merchant.company_name
      });

      return {
        ...merchant,
        message: 'Cadastro realizado com sucesso. Os documentos estão em análise.'
      };
    } catch (error) {
      logger.error('Erro no processo de registro', {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          stack: error.stack
        },
        merchantData: {
          email: merchantData.email,
          cnpj: merchantData.cnpj,
          companyName: merchantData.company_name
        }
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        code: 'UNKNOWN_ERROR',
        message: 'Erro ao processar o registro. Por favor, tente novamente.',
        details: error.message
      });
    }
  }

  private async uploadDocuments(userId: string, data: CreateMerchantDto) {
    try {
      const documentUrls: Record<string, any> = {};
      const doc = data.documents.file;

      try {
        logger.info(`Iniciando upload do documento`, {
          userId,
          documentType: doc.type,
          hasData: !!doc.base64
        });

        // Verificar se o base64 está no formato correto
        if (!doc.base64.startsWith('data:')) {
          throw new BadRequestException({
            code: 'INVALID_FILE_FORMAT',
            message: `Formato inválido para documento. Deve iniciar com data:`,
            field: `document`
          });
        }

        // Extrair o tipo MIME e os dados do base64
        const matches = doc.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          throw new BadRequestException({
            code: 'INVALID_FILE_FORMAT',
            message: `Formato inválido para documento`,
            field: `document`
          });
        }

        const mimeType = matches[1];
        const base64File = matches[2];
        
        // Validar tipo MIME
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimes.includes(mimeType)) {
          throw new BadRequestException({
            code: 'INVALID_FILE_TYPE',
            message: `Tipo de arquivo não suportado: ${mimeType}. Tipos permitidos: PDF, JPEG ou PNG`,
            field: `document`
          });
        }

        const buffer = Buffer.from(base64File, 'base64');
        
        // Validar tamanho (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB em bytes
        if (buffer.length > maxSize) {
          throw new BadRequestException({
            code: 'FILE_TOO_LARGE',
            message: `O arquivo excede o tamanho máximo permitido de 5MB`,
            field: `document`
          });
        }

        // Determinar a extensão do arquivo
        let extension;
        switch (mimeType) {
          case 'application/pdf':
            extension = 'pdf';
            break;
          case 'image/jpeg':
            extension = 'jpg';
            break;
          case 'image/png':
            extension = 'png';
            break;
          default:
            throw new BadRequestException({
              code: 'INVALID_FILE_TYPE',
              message: `Tipo de arquivo não suportado: ${mimeType}`,
              field: `document`
            });
        }

        const filename = `${userId}/${doc.type}.${extension}`;

        // Upload do arquivo com retentativas
        let uploadSuccess = false;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
          try {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('merchant-documents')
              .upload(filename, buffer, {
                contentType: mimeType,
                upsert: true
              });

            if (uploadError) throw uploadError;

            // Gerar URL pública do documento
            const { data: urlData } = supabase.storage
              .from('merchant-documents')
              .getPublicUrl(filename);

            documentUrls[doc.type] = {
              url: urlData.publicUrl,
              status: 'pending',
              uploaded_at: new Date().toISOString()
            };

            uploadSuccess = true;
            break;
          } catch (error) {
            if (attempt === this.MAX_RETRIES) {
              throw new BadRequestException({
                code: 'UPLOAD_ERROR',
                message: `Erro ao fazer upload do documento. Por favor, tente novamente.`,
                field: `document`,
                details: error.message
              });
            }
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          }
        }

        if (!uploadSuccess) {
          throw new BadRequestException({
            code: 'UPLOAD_ERROR',
            message: `Erro ao fazer upload do documento. Por favor, tente novamente.`,
            field: `document`
          });
        }

      } catch (error) {
        logger.error(`Error uploading document`, {
          error,
          userId,
          type: doc.type
        });
        throw error;
      }

      return documentUrls;
    } catch (error) {
      logger.error('Error in uploadDocuments', {
        error,
        userId
      });
      throw error;
    }
  }

  async getMerchantById(id: string) {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new NotFoundException('Comerciante não encontrado');

      return data;
    } catch (error) {
      logger.error('Error fetching merchant', {
        error,
        merchantId: id
      });
      throw error;
    }
  }

  async getMerchantStatistics(merchantId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar transações
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (txError) throw txError;

      // Buscar saldo do merchant
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('balance, can_withdraw')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;

      const stats = {
        pixToday: 0,
        pix30Days: 0,
        totalTransactions: transactions?.length || 0,
        availableBalance: merchant?.can_withdraw ? (merchant?.balance || 0) : 0,
        pendingBalance: !merchant?.can_withdraw ? (merchant?.balance || 0) : 0,
        successRate: 0,
        averageTicket: 0,
        chargebackRate: 0
      };

      if (transactions?.length) {
        const successful = transactions.filter(tx => tx.status === 'completed');
        const chargebacks = transactions.filter(tx => tx.status === 'chargeback');
        
        // Calcular taxas
        stats.successRate = (successful.length / transactions.length) * 100;
        stats.chargebackRate = (chargebacks.length / transactions.length) * 100;
        
        // Calcular ticket médio (apenas transações completadas)
        if (successful.length > 0) {
          stats.averageTicket = successful.reduce((sum, tx) => sum + tx.amount, 0) / successful.length;
        }

        // Calcular volumes PIX
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

      logger.info('Merchant statistics calculated', {
        merchantId,
        stats
      });

      return stats;
    } catch (error) {
      logger.error('Error calculating merchant statistics', {
        error,
        merchantId
      });
      throw error;
    }
  }

  async getDashboardStats(merchantId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (txError) throw txError;

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('balance, can_withdraw, documents_status, documents_submitted')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;

      const stats = {
        pixToday: 0,
        pix30Days: 0,
        totalTransactions: transactions?.length || 0,
        successRate: 0,
        averageTicket: 0,
        chargebackRate: 0,
        availableBalance: merchant?.can_withdraw ? (merchant?.balance || 0) : 0,
        documentsStatus: merchant?.documents_status || 'pending',
        documentsSubmitted: merchant?.documents_submitted || false,
        canWithdraw: merchant?.can_withdraw || false
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

      logger.info('Dashboard stats calculated', {
        merchantId,
        stats
      });

      return stats;
    } catch (error) {
      logger.error('Error calculating dashboard stats', {
        error,
        merchantId
      });
      throw error;
    }
  }
}