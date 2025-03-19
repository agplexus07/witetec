import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DocumentFile {
  @ApiProperty({
    description: 'Base64 do arquivo',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
  })
  @IsString()
  base64: string;

  @ApiProperty({
    description: 'Tipo do documento',
    example: 'cnpj'
  })
  @IsString()
  type: string;
}

export class CreateMerchantDto {
  @ApiProperty({
    description: 'Razão social da empresa',
    example: 'Empresa Exemplo LTDA',
  })
  @IsString()
  company_name: string;

  @ApiPropertyOptional({
    description: 'Nome fantasia da empresa',
    example: 'Empresa Exemplo',
  })
  @IsString()
  @IsOptional()
  trading_name?: string;

  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12.345.678/0001-90',
  })
  @IsString()
  cnpj: string;

  @ApiProperty({
    description: 'Email comercial',
    example: 'contato@empresa.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Telefone comercial',
    example: '(11) 99999-9999',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Endereço completo',
    example: 'Rua Exemplo, 123',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Cidade',
    example: 'São Paulo',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Estado',
    example: 'SP',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'CEP',
    example: '12345-678',
  })
  @IsString()
  @IsOptional()
  postal_code?: string;

  @ApiProperty({
    description: 'Documentos do comerciante',
    example: {
      file: {
        base64: 'data:image/jpeg;base64,...',
        type: 'cnpj'
      }
    }
  })
  @IsObject()
  documents: {
    file: DocumentFile;
  };
}

export class MerchantStatisticsDto {
  @ApiProperty({
    description: 'Volume PIX hoje',
    example: 1000.00
  })
  pixToday: number;

  @ApiProperty({
    description: 'Volume PIX últimos 30 dias',
    example: 15000.00
  })
  pix30Days: number;

  @ApiProperty({
    description: 'Total de transações',
    example: 50
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Saldo disponível',
    example: 5000.00
  })
  availableBalance: number;

  @ApiProperty({
    description: 'Saldo pendente',
    example: 1000.00
  })
  pendingBalance: number;

  @ApiProperty({
    description: 'Taxa de sucesso (%)',
    example: 98.5
  })
  successRate: number;

  @ApiProperty({
    description: 'Ticket médio',
    example: 250.00
  })
  averageTicket: number;

  @ApiProperty({
    description: 'Taxa de chargeback (%)',
    example: 0.5
  })
  chargebackRate: number;
}