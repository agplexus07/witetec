import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';
import { 
  CreateMerchantDto, 
  SubmitMerchantDocumentsDto,
  MerchantStatisticsDto 
} from './dto/merchant.dto';

@Injectable()
export class MerchantsService {
  async register(merchantData: CreateMerchantDto) {
    try {
      logger.info('Iniciando registro de comerciante', {
        email: merchantData.email,
        cnpj: merchantData.cnpj
      });

      // Validar dados obrigatórios
      const requiredFields = [
        'company_name',
        'cnpj',
        'email'
      ];

      const missingFields = requiredFields.filter(field => !merchantData[field]);
      if (missingFields.length > 0) {
        logger.error('Campos obrigatórios faltando', { missingFields });
        throw new BadRequestException(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }

      // Criar novo usuário com email/senha
      logger.info('Criando usuário no Supabase Auth', { email: merchantData.email });
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: merchantData.email,
        password: merchantData.cnpj // Usando CNPJ como senha inicial
      });

      if (signUpError) {
        logger.error('Erro ao criar usuário no Supabase Auth', {
          error: signUpError,
          email: merchantData.email
        });
        
        if (signUpError.message.includes('User already registered')) {
          throw new BadRequestException('Email já cadastrado. Por favor, use outro email.');
        }
        
        throw new BadRequestException('Erro ao criar usuário: ' + signUpError.message);
      }

      if (!authData.user) {
        logger.error('Usuário não criado no Supabase Auth', { email: merchantData.email });
        throw new BadRequestException('Erro ao criar usuário');
      }

      logger.info('Usuário criado com sucesso', {
        userId: authData.user.id,
        email: merchantData.email
      });

      // Criar o comerciante
      logger.info('Criando registro do comerciante', {
        userId: authData.user.id,
        companyName: merchantData.company_name
      });

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert([{
          ...merchantData,
          id: authData.user.id,
          fee_type: 'percentage',
          fee_percentage: 2.99,
          documents_submitted: false,
          can_generate_api_key: false,
          can_withdraw: false
        }])
        .select()
        .single();

      if (merchantError) {
        logger.error('Erro ao criar registro do comerciante', {
          error: merchantError,
          userId: authData.user.id,
          companyName: merchantData.company_name
        });

        // Tentar reverter a criação do usuário
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        if (merchantError.message.includes('duplicate key')) {
          throw new BadRequestException('CNPJ já cadastrado. Por favor, verifique os dados.');
        }
        
        throw merchantError;
      }

      logger.info('Comerciante registrado com sucesso', {
        merchantId: merchant.id,
        companyName: merchant.company_name
      });

      return {
        ...merchant,
        message: 'Cadastro realizado com sucesso. Envie os documentos para ativar todas as funcionalidades.'
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

      throw new BadRequestException(
        'Erro ao processar o registro. Por favor, verifique os dados e tente novamente.'
      );
    }
  }

  async submitDocuments(merchantId: string, documentsData: SubmitMerchantDocumentsDto) {
    try {
      // Verificar se o comerciante existe
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError || !merchant) {
        throw new NotFoundException('Comerciante não encontrado');
      }

      // Upload dos documentos
      logger.info('Iniciando upload dos documentos', { merchantId });
      const documentUrls = await this.uploadDocuments(merchantId, documentsData);
      logger.info('Upload dos documentos concluído', {
        merchantId,
        documentCount: Object.keys(documentUrls).length
      });

      // Atualizar o comerciante
      const { data: updatedMerchant, error: updateError } = await supabase
        .from('merchants')
        .update({
          document_urls: documentUrls,
          documents_submitted: true,
          documents_status: 'pending'
        })
        .eq('id', merchantId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info('Documentos enviados com sucesso', {
        merchantId,
        documentsStatus: 'pending'
      });

      return {
        ...updatedMerchant,
        message: 'Documentos enviados com sucesso. Aguarde a análise.'
      };
    } catch (error) {
      logger.error('Erro ao enviar documentos', {
        error,
        merchantId
      });
      throw error;
    }
  }

  private async uploadDocuments(userId: string, data: SubmitMerchantDocumentsDto) {
    const documents = {
      contract: data.contract_document,
      cnpj: data.cnpj_document,
      identity: data.identity_document,
      selfie: data.identity_selfie,
      bank: data.bank_document
    };

    const documentUrls: Record<string, any> = {};

    for (const [type, base64Data] of Object.entries(documents)) {
      try {
        logger.info(`Iniciando upload do documento ${type}`, {
          userId,
          documentType: type,
          hasData: !!base64Data
        });

        // Adicionar prefixo data: se não existir
        let processedData = base64Data as string;
        if (!processedData.startsWith('data:')) {
          // Detectar tipo de arquivo baseado no conteúdo
          const isPDF = processedData.includes('JVBERi');
          const mimeType = isPDF ? 'application/pdf' : 'image/png';
          processedData = `data:${mimeType};base64,${processedData}`;
        }

        // Extrair o tipo MIME e os dados do base64
        const matches = processedData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          logger.error(`Formato inválido para documento ${type}`, {
            userId,
            documentType: type,
            hasMatches: !!matches,
            matchLength: matches?.length
          });
          throw new Error(`Formato inválido para documento ${type}`);
        }

        const mimeType = matches[1];
        const base64File = matches[2];
        
        // Validar tipo MIME
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimes.includes(mimeType)) {
          logger.error(`Tipo de arquivo não permitido para ${type}`, {
            userId,
            documentType: type,
            mimeType
          });
          throw new Error(`Tipo de arquivo não suportado: ${mimeType}. Tipos permitidos: PDF, JPEG ou PNG`);
        }

        const buffer = Buffer.from(base64File, 'base64');
        
        // Validar tamanho (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB em bytes
        if (buffer.length > maxSize) {
          logger.error(`Arquivo muito grande para ${type}`, {
            userId,
            documentType: type,
            size: buffer.length,
            maxSize
          });
          throw new Error(`O arquivo ${type} excede o tamanho máximo permitido de 5MB`);
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
            throw new Error(`Tipo de arquivo não suportado: ${mimeType}`);
        }

        const filename = `${userId}/${type}.${extension}`;

        logger.info(`Iniciando upload para Storage`, {
          userId,
          documentType: type,
          filename,
          size: buffer.length
        });

        // Upload do arquivo para o Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('merchant-documents')
          .upload(filename, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (uploadError) {
          logger.error(`Erro no upload para Storage`, {
            userId,
            documentType: type,
            error: uploadError
          });
          throw uploadError;
        }

        // Gerar URL pública do documento
        const { data: urlData } = supabase.storage
          .from('merchant-documents')
          .getPublicUrl(filename);

        documentUrls[type] = {
          url: urlData.publicUrl,
          status: 'pending',
          uploaded_at: new Date().toISOString()
        };

        logger.info(`Upload do documento ${type} concluído com sucesso`, {
          userId,
          documentType: type,
          url: urlData.publicUrl
        });

      } catch (error) {
        logger.error(`Error uploading ${type} document`, {
          error,
          userId,
          type
        });
        throw new BadRequestException(`Erro ao fazer upload do documento ${type}: ${error.message}`);
      }
    }

    return documentUrls;
  }

  async getMerchantById(id: string) {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error fetching merchant', {
        error,
        merchantId: id
      });
      throw error;
    }
  }

  async getMerchantStatistics(merchantId: string): Promise<MerchantStatisticsDto> {
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