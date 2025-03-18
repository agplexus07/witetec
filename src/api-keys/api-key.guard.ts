import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Chave de API é obrigatória');
    }

    const isValid = await this.apiKeysService.validateApiKey(apiKey);
    if (!isValid) {
      throw new UnauthorizedException('Chave de API inválida');
    }

    // Obter ID do comerciante da chave de API e anexar à requisição
    const merchantId = await this.apiKeysService.getMerchantIdFromApiKey(apiKey);
    request.merchantId = merchantId;

    return true;
  }
}