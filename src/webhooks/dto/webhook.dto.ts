import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsUrl, IsArray, IsOptional } from 'class-validator';

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
    require_valid_protocol: true,
    protocols: ['http', 'https']
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Descrição do webhook',
    example: 'Webhook para notificações PIX'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Eventos para notificação',
    example: ['payment.success', 'payment.failed'],
    default: ['payment.success', 'payment.failed']
  })
  @IsArray()
  @IsOptional()
  events?: string[];
}

export class OnzWebhookDto {
  @ApiProperty({
    description: 'ID da transação',
    example: '971122d8f37211eaadc10242ac120002'
  })
  @IsString()
  txid: string;

  @ApiProperty({
    description: 'Valor do pagamento',
    example: '110.00'
  })
  @IsString()
  valor: string;

  @ApiProperty({
    description: 'Data e hora do pagamento',
    example: '2020-09-09T20:15:00.358Z'
  })
  @IsString()
  horario: string;

  @ApiProperty({
    description: 'Informações do pagador',
    example: {
      cpf: '0123456789',
      nome: 'Nome Pagador'
    }
  })
  pagador: {
    cpf: string;
    nome: string;
  };

  @ApiProperty({
    description: 'ID único end-to-end da transação',
    example: 'E12345678202009091221abcdef12345'
  })
  @IsString()
  endToEndId: string;
}