import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';
import { ChangePasswordDto } from './dto/auth.dto';

interface MerchantCapabilities {
  can_generate_api_key: boolean;
  can_withdraw: boolean;
}

@Injectable()
export class AuthService {
  private lastRegistrationAttempt: number = 0;
  private readonly REGISTRATION_COOLDOWN = 60000; // 1 minuto em milissegundos

  async login(email: string, password: string) {
    try {
      logger.info('Iniciando login', { email });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          // Remove expiresIn option to use default no expiration
        }
      });

      if (authError) throw new UnauthorizedException(authError.message);

      // Verificar se existe registro do comerciante
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('status, rejection_reason, documents_submitted, documents_status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (merchantError) throw merchantError;

      // Se não existir registro de comerciante
      if (!merchant) {
        logger.info('User logged in but merchant registration pending', {
          userId: authData.user.id,
          email
        });

        return {
          ...authData,
          merchant_status: 'registration_required',
          message: 'Autenticação realizada com sucesso. É necessário completar o cadastro do estabelecimento.'
        };
      }

      // Obter capacidades do comerciante usando a nova função
      const { data: capabilities, error: capabilitiesError } = await supabase
        .rpc('check_merchant_capabilities', {
          merchant_id: authData.user.id
        })
        .single() as { data: MerchantCapabilities | null, error: any };

      if (capabilitiesError) throw capabilitiesError;

      // Verificar status do comerciante
      switch (merchant.status) {
        case 'pending':
          logger.info('Merchant login with pending status', {
            userId: authData.user.id,
            email
          });
          return {
            ...authData,
            merchant_status: 'pending',
            documents_submitted: merchant.documents_submitted,
            documents_status: merchant.documents_status,
            can_generate_api_key: capabilities?.can_generate_api_key || false,
            can_withdraw: capabilities?.can_withdraw || false,
            message: merchant.documents_submitted ? 
              'Documentos em análise. Aguardando aprovação.' : 
              'Cadastro realizado. Envie os documentos para ativar todas as funcionalidades.'
          };

        case 'rejected':
          logger.warn('Rejected merchant attempted login', {
            userId: authData.user.id,
            email
          });
          return {
            ...authData,
            merchant_status: 'rejected',
            message: 'Cadastro recusado.',
            rejection_reason: merchant.rejection_reason
          };

        case 'approved':
          logger.info('Successful merchant login', {
            userId: authData.user.id,
            email
          });
          return {
            ...authData,
            merchant_status: 'approved',
            documents_submitted: merchant.documents_submitted,
            documents_status: merchant.documents_status,
            can_generate_api_key: capabilities?.can_generate_api_key || false,
            can_withdraw: capabilities?.can_withdraw || false,
            message: 'Login realizado com sucesso.'
          };

        default:
          throw new UnauthorizedException('Status do comerciante inválido');
      }
    } catch (error) {
      logger.error('Login error', {
        error,
        email
      });
      throw error;
    }
  }

  async adminLogin(email: string, password: string) {
    try {
      logger.debug('Iniciando login de admin', { email });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          // Remove expiresIn option to use default no expiration
        }
      });

      if (authError) {
        logger.error('Erro na autenticação', { error: authError });
        throw new UnauthorizedException(authError.message);
      }

      logger.debug('Usuário autenticado, verificando se é admin', { userId: authData.user.id });

      // Verificar se é um admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (adminError) {
        logger.error('Erro ao buscar admin_user', { error: adminError });
        throw new UnauthorizedException('Erro ao verificar permissões de admin');
      }

      if (!adminUser) {
        logger.warn('Usuário não é admin', { userId: authData.user.id });
        throw new UnauthorizedException('Acesso não autorizado');
      }

      logger.info('Successful admin login', {
        userId: authData.user.id,
        email,
        adminId: adminUser.id,
        permissions: adminUser.permissions
      });

      return {
        ...authData,
        admin: {
          id: adminUser.id,
          name: adminUser.name,
          permissions: adminUser.permissions
        }
      };
    } catch (error) {
      logger.error('Admin login error', {
        error,
        email
      });
      throw error;
    }
  }

  async register(email: string, password: string) {
    try {
      const now = Date.now();
      if (now - this.lastRegistrationAttempt < this.REGISTRATION_COOLDOWN) {
        throw new UnauthorizedException('Por favor, aguarde um minuto antes de tentar novamente');
      }
      this.lastRegistrationAttempt = now;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.PUBLIC_URL || 'https://witetec.com.br'}/auth/callback`
        }
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new UnauthorizedException('Muitas tentativas de registro. Por favor, aguarde alguns minutos.');
        }
        throw new UnauthorizedException(error.message);
      }

      if (!data.user) {
        throw new UnauthorizedException('Erro ao criar usuário');
      }

      logger.info('New user registered', {
        userId: data.user.id,
        email
      });

      return {
        ...data,
        message: 'Registro realizado com sucesso. Faça login e complete o cadastro do estabelecimento.'
      };
    } catch (error) {
      logger.error('Registration error', {
        error,
        email
      });
      throw error;
    }
  }

  async changePassword(data: ChangePasswordDto) {
    try {
      // Verificar se as senhas coincidem
      if (data.newPassword !== data.confirmPassword) {
        throw new BadRequestException('A nova senha e a confirmação não coincidem');
      }

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new UnauthorizedException('Usuário não autenticado');
      }

      // Verificar a senha atual
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: data.currentPassword,
      });

      if (verifyError) {
        throw new BadRequestException('Senha atual incorreta');
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        throw new BadRequestException('Erro ao atualizar senha');
      }

      logger.info('Password changed successfully', {
        userId: user.id
      });

      return { message: 'Senha alterada com sucesso' };
    } catch (error) {
      logger.error('Error changing password', { error });
      throw error;
    }
  }

  async getProfile() {
    try {
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new UnauthorizedException('Usuário não autenticado');
      }

      // Buscar dados do comerciante
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select(`
          company_name,
          trading_name,
          cnpj,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          status,
          balance,
          fee_percentage,
          documents_submitted,
          documents_status
        `)
        .eq('id', user.id)
        .maybeSingle();

      // Se o comerciante não existir, retornar apenas os dados do usuário
      if (merchantError || !merchant) {
        return {
          personal: {
            email: user.email,
            last_sign_in: user.last_sign_in_at,
          },
          merchant_status: 'registration_required'
        };
      }

      // Obter capacidades do comerciante
      const { data: capabilities, error: capabilitiesError } = await supabase
        .rpc('check_merchant_capabilities', {
          merchant_id: user.id
        })
        .single() as { data: MerchantCapabilities | null, error: any };

      if (capabilitiesError) throw capabilitiesError;

      // Organizar os dados
      return {
        personal: {
          email: user.email,
          last_sign_in: user.last_sign_in_at,
        },
        business: {
          company_name: merchant.company_name,
          trading_name: merchant.trading_name,
          cnpj: merchant.cnpj,
          email: merchant.email,
          phone: merchant.phone,
        },
        address: {
          street: merchant.address,
          city: merchant.city,
          state: merchant.state,
          postal_code: merchant.postal_code,
        },
        status: merchant.status,
        documents_submitted: merchant.documents_submitted,
        documents_status: merchant.documents_status,
        can_generate_api_key: capabilities?.can_generate_api_key || false,
        can_withdraw: capabilities?.can_withdraw || false,
        financial: {
          balance: merchant.balance,
          fee_percentage: merchant.fee_percentage,
        }
      };
    } catch (error) {
      logger.error('Error fetching profile', { error });
      throw error;
    }
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      logger.info('User logged out');

      return { message: 'Logout realizado com sucesso' };
    } catch (error) {
      logger.error('Logout error', { error });
      throw error;
    }
  }
}
