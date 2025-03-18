import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean, IsUrl, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'ID do comerciante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  merchant_id: string;

  @ApiProperty({
    description: 'Nome da chave de API',
    example: 'Integração E-commerce',
  })
  @IsString()
  key_name: string;

  @ApiPropertyOptional({
    description: 'URL do webhook',
    example: 'https://api.seusite.com.br/webhooks/pix',
  })
  @IsUrl()
  @IsOptional()
  webhook_url?: string;

  @ApiPropertyOptional({
    description: 'Modo de teste',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  test_mode?: boolean;

  @ApiPropertyOptional({
    description: 'Data de expiração',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expires_at?: string;
}