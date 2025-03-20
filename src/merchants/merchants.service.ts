import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';
import { CreateMerchantDto, ApiResponse, MerchantStatisticsDto } from './dto/merchant.dto';
import { Request } from 'express';

@Injectable()
export class MerchantsService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  async validateMerchantStatus(merchantId: string): Promise<{
    canWithdraw: boolean;
    canGenerateApiKey: boolean;
    documentsApproved: boolean;
    status: string;
  }> {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('status, document_urls, can_withdraw, can_generate_api_key')
      .eq('id', merchantId)
      .single();

    if (error || !merchant) {
      throw new NotFoundException('Comerciante não encontrado');
    }

    const documentUrls = merchant.document_urls as Record<string, any> || {};
    const documentsApproved = Object.values(documentUrls).every(
      doc => doc.status === 'approved'
    );

    return {
      canWithdraw: merchant.can_withdraw,
      canGenerateApiKey: merchant.can_generate_api_key,
      documentsApproved,
      status: merchant.status
    };
  }

  async register(merchantData: CreateMerchantDto, req: Request) {
    try {
      logger.info('Iniciando registro de comerciante', {
        email: merchantData.email,
        cnpj: merchantData.cnpj
      });

      const requiredFields = [
        'company_name',
        'cnpj',
        'email',
        'documents'
      ];

      const missingFields = requiredFields.filter(field => !merchantData[field]);
      if (missingFields.length > 0) {
        return {
          status: 'error',
          code: 'MISSING_FIELDS',
          message: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
          fields: missingFields,
          statusCode: 400
        };
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          status: 'error',
          code: 'AUTH_ERROR',
          message: 'Usuário não autenticado',
          statusCode: 401,
          details: userError?.message
        };
      }

      const { data: existingMerchant } = await supabase
        .from('merchants')
        .select('id, status')
        .eq('id', user.id)
        .single();

      if (existingMerchant) {
        return {
          status: 'error',
          code: 'MERCHANT_EXISTS',
          message: 'Comerciante já registrado',
          statusCode: 400,
          details: `Status atual: ${existingMerchant.status}`
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          status: 'error',
          code: 'AUTH_ERROR',
          message: 'Sessão inválida',
          statusCode: 401,
          details: sessionError?.message
        };
      }

      const documentUrls = {};
      for (const [docType, base64Data] of Object.entries(merchantData.documents)) {
        try {
          if (!base64Data) {
            return {
              status: 'error',
              code: 'INVALID_FILE_FORMAT',
              message: `Dados inválidos para o documento ${docType}`,
              field: docType,
              statusCode: 400
            };
          }

          if (!base64Data.startsWith('data:')) {
            return {
              status: 'error',
              code: 'INVALID_FILE_FORMAT',
              message: `Formato inválido para documento ${docType}. Deve iniciar com data:`,
              field: docType,
              statusCode: 400
            };
          }

          const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (!matches || matches.length !== 3) {
            return {
              status: 'error',
              code: 'INVALID_FILE_FORMAT',
              message: `Formato inválido para documento ${docType}`,
              field: docType,
              statusCode: 400
            };
          }

          const mimeType = matches[1];
          const base64File = matches[2];
          
          const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
          if (!allowedMimes.includes(mimeType)) {
            return {
              status: 'error',
              code: 'INVALID_FILE_TYPE',
              message: `Tipo de arquivo não suportado para ${docType}: ${mimeType}. Tipos permitidos: PDF, JPEG ou PNG`,
              field: docType,
              statusCode: 400
            };
          }

          const buffer = Buffer.from(base64File, 'base64');
          
          const maxSize = 5 * 1024 * 1024;
          if (buffer.length > maxSize) {
            return {
              status: 'error',
              code: 'FILE_TOO_LARGE',
              message: `O arquivo ${docType} excede o tamanho máximo permitido de 5MB`,
              field: docType,
              statusCode: 400
            };
          }

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
              return {
                status: 'error',
                code: 'INVALID_FILE_TYPE',
                message: `Tipo de arquivo não suportado para ${docType}: ${mimeType}`,
                field: docType,
                statusCode: 400
              };
          }

          const filename = `${user.id}/${docType}.${extension}`;

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

              const { data: urlData } = supabase.storage
                .from('merchant-documents')
                .getPublicUrl(filename);

              documentUrls[docType] = {
                url: urlData.publicUrl,
                status: 'pending',
                uploaded_at: new Date().toISOString()
              };

              uploadSuccess = true;
              break;
            } catch (error) {
              if (attempt === this.MAX_RETRIES) {
                return {
                  status: 'error',
                  code: 'UPLOAD_ERROR',
                  message: `Erro ao fazer upload do documento ${docType}. Por favor, tente novamente.`,
                  field: docType,
                  statusCode: 400,
                  details: error.message
                };
              }
              await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            }
          }

          if (!uploadSuccess) {
            return {
              status: 'error',
              code: 'UPLOAD_ERROR',
              message: `Erro ao fazer upload do documento ${docType}. Por favor, tente novamente.`,
              field: docType,
              statusCode: 400
            };
          }

        } catch (error) {
          logger.error(`Error uploading document ${docType}`, {
            error,
            userId: user.id,
            docType
          });
          throw error;
        }
      }

      let merchant;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const { data, error } = await supabase
            .from('merchants')
            .upsert([{
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
              if (error.message.includes('email')) {
                return {
                  status: 'error',
                  code: 'EMAIL_IN_USE',
                  message: 'Email já cadastrado. Por favor, utilize outro email.',
                  field: 'email',
                  statusCode: 400
                };
              }
              if (error.message.includes('cnpj')) {
                return {
                  status: 'error',
                  code: 'CNPJ_IN_USE',
                  message: 'CNPJ já cadastrado. Por favor, verifique os dados.',
                  field: 'cnpj',
                  statusCode: 400
                };
              }
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
            return {
              status: 'error',
              code: 'REGISTRATION_ERROR',
              message: 'Erro ao criar registro do comerciante. Por favor, tente novamente.',
              statusCode: 400,
              details: error.message
            };
          }
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }

      logger.info('Comerciante registrado com sucesso', {
        merchantId: merchant.id,
        companyName: merchant.company_name
      });

      return {
        status: 'success',
        data: {
          id: merchant.id,
          company_name: merchant.company_name,
          status: merchant.status,
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in
          }
        },
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
        return {
          status: 'error',
          code: error.getResponse()['code'] || 'BAD_REQUEST',
          message: error.message,
          statusCode: error.getStatus(),
          details: error.getResponse()['details']
        };
      }

      return {
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: 'Erro ao processar o registro. Por favor, tente novamente.',
        statusCode: 500,
        details: error.message
      };
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

      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error fetching merchant', {
        error,
        merchantId: id
      });

      if (error instanceof NotFoundException) {
        return {
          status: 'error',
          code: 'NOT_FOUND',
          message: error.message,
          statusCode: 404
        };
      }

      return {
        status: 'error',
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar dados do comerciante',
        statusCode: 500,
        details: error.message
      };
    }
  }

  async getMerchantStatistics(merchantId: string): Promise<ApiResponse<MerchantStatisticsDto>> {
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
        .select('balance, can_withdraw')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;

      const stats: MerchantStatisticsDto = {
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
        
        stats.successRate = (successful.length / transactions.length) * 100;
        stats.chargebackRate = (chargebacks.length / transactions.length) * 100;
        
        if (successful.length > 0) {
          stats.averageTicket = successful.reduce((sum, tx) => sum + tx.amount, 0) / successful.length;
        }

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

      return {
        status: 'success',
        data: stats
      };
    } catch (error) {
      logger.error('Error calculating merchant statistics', {
        error,
        merchantId
      });

      return {
        status: 'error',
        code: 'STATS_ERROR',
        message: 'Erro ao calcular estatísticas do comerciante',
        statusCode: 500,
        details: error.message
      };
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

      return {
        status: 'success',
        data: stats
      };
    } catch (error) {
      logger.error('Error calculating dashboard stats', {
        error,
        merchantId
      });

      return {
        status: 'error',
        code: 'DASHBOARD_ERROR',
        message: 'Erro ao calcular estatísticas do dashboard',
        statusCode: 500,
        details: error.message
      };
    }
  }
}