import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsUrl, IsUUID, IsOptional } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'ID do comerciante',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  merchant_id: string;

  @ApiProperty({
    description: 'URL do webhook',
    example: 'https://api.seusite.com.br/webhooks/pix'
  })
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['http', 'https']
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Descrição do webhook',
    example: 'Webhook para notificações de pagamento'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Eventos para receber notificações',
    example: ['payment.success', 'payment.failed']
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];
}