import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';

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
}

export class UpdateMerchantFeeDto {
  @ApiProperty({
    description: 'Percentual da taxa',
    example: 2.99,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercentage: number;
}

export class UpdateMerchantStatusDto {
  @ApiProperty({
    description: 'Status do comerciante',
    example: 'approved',
    enum: ['approved', 'rejected'],
  })
  @IsString()
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Motivo da rejeição',
    example: 'Documentação incompleta',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Tipo do documento',
    enum: ['cnpj', 'id', 'proof_of_address', 'bank_statement'],
  })
  @IsEnum(['cnpj', 'id', 'proof_of_address', 'bank_statement'])
  type: string;

  @ApiProperty({
    description: 'Arquivo do documento',
    type: 'string',
    format: 'binary',
  })
  file: any;
}