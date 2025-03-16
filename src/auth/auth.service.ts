import { Injectable, UnauthorizedException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';

@Injectable()
export class AuthService {
  private lastRegistrationAttempt: number = 0;
  private readonly REGISTRATION_COOLDOWN = 60000; // 1 minuto em milissegundos

  async login(email: string, password: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new UnauthorizedException(authError.message);

      // Verificar status do comerciante
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('status')
        .eq('id', authData.user.id)
        .single();

      if (merchantError) throw merchantError;

      if (merchant?.status !== 'approved') {
        logger.warn('Login attempt by unapproved merchant', {
          email,
          status: merchant?.status
        });
        throw new UnauthorizedException('Conta aguardando aprovação');
      }

      logger.info('Successful login', {
        userId: authData.user.id,
        email
      });

      return authData;
    } catch (error) {
      logger.error('Login error', {
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
          emailRedirectTo: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
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

      return data;
    } catch (error) {
      logger.error('Registration error', {
        error,
        email
      });
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