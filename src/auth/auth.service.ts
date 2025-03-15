import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { supabase } from '../config/supabase.config';
import { logger } from '../config/logger.config';

@Injectable()
export class AuthService {
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
      // Validar formato do email
      if (!this.isValidEmail(email)) {
        throw new BadRequestException('Formato de email inválido');
      }

      // Validar senha
      if (!this.isValidPassword(password)) {
        throw new BadRequestException('A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `https://witetec.com/auth/callback`
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new BadRequestException('Email já cadastrado');
        }
        throw new UnauthorizedException(error.message);
      }

      logger.info('New user registered', {
        userId: data.user?.id,
        email
      });

      return data;
    } catch (error) {
      logger.error('Registration error', {
        error,
        email
      });
      
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Erro ao registrar usuário. Por favor, tente novamente.');
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
  }
}