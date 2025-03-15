"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../config/supabase.config");
const logger_config_1 = require("../config/logger.config");
let AuthService = class AuthService {
    async login(email, password) {
        try {
            const { data: authData, error: authError } = await supabase_config_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (authError)
                throw new common_1.UnauthorizedException(authError.message);
            const { data: merchant, error: merchantError } = await supabase_config_1.supabase
                .from('merchants')
                .select('status')
                .eq('id', authData.user.id)
                .single();
            if (merchantError)
                throw merchantError;
            if (merchant?.status !== 'approved') {
                logger_config_1.logger.warn('Login attempt by unapproved merchant', {
                    email,
                    status: merchant?.status
                });
                throw new common_1.UnauthorizedException('Conta aguardando aprovação');
            }
            logger_config_1.logger.info('Successful login', {
                userId: authData.user.id,
                email
            });
            return authData;
        }
        catch (error) {
            logger_config_1.logger.error('Login error', {
                error,
                email
            });
            throw error;
        }
    }
    async register(email, password) {
        try {
            const { data, error } = await supabase_config_1.supabase.auth.signUp({
                email,
                password,
            });
            if (error)
                throw new common_1.UnauthorizedException(error.message);
            logger_config_1.logger.info('New user registered', {
                userId: data.user?.id,
                email
            });
            return data;
        }
        catch (error) {
            logger_config_1.logger.error('Registration error', {
                error,
                email
            });
            throw error;
        }
    }
    async logout() {
        try {
            const { error } = await supabase_config_1.supabase.auth.signOut();
            if (error)
                throw error;
            logger_config_1.logger.info('User logged out');
            return { message: 'Logout realizado com sucesso' };
        }
        catch (error) {
            logger_config_1.logger.error('Logout error', { error });
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map