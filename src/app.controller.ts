import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { onzClient } from './config/onz.config';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('token')
  @ApiOperation({ summary: 'Gerar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token gerado com sucesso' })
  async generateToken() {
    const token = await onzClient.getAccessToken();
    return { access_token: token };
  }
}