import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNumber, 
  IsUUID, 
  IsOptional, 
  Min, 
  Max, 
  IsEnum, 
  IsArray, 
  IsIn 
} from 'class-validator';

export interface DocumentInfo {
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface MerchantDocumentUrls {
  [key: string]: DocumentInfo;
}

export class UpdateMerchantFeeDto {
  @ApiProperty({
    description: 'Tipo da taxa',
    example: 'fixed',
    enum: ['fixed', 'percentage']
  })
  @IsEnum(['fixed', 'percentage'])
  fee_type: 'fixed' | 'percentage';

  @ApiProperty({
    description: 'Valor da taxa fixa em centavos',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fee_amount?: number;

  @ApiProperty({
    description: 'Valor da taxa percentual',
    example: 2.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  fee_percentage?: number;
}

export class UpdateMerchantStatusDto {
  @ApiProperty({
    description: 'Status do comerciante',
    example: 'approved',
    enum: ['approved', 'rejected'],
  })
  @IsString()
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Motivo da rejeição',
    example: 'Documentação incompleta',
  })
  @IsString()
  @IsOptional()
  rejection_reason?: string;

  @ApiPropertyOptional({
    description: 'Tipo da taxa',
    example: 'fixed',
    enum: ['fixed', 'percentage']
  })
  @IsEnum(['fixed', 'percentage'])
  @IsOptional()
  fee_type?: 'fixed' | 'percentage';

  @ApiPropertyOptional({
    description: 'Valor da taxa fixa em centavos',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fee_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor da taxa percentual',
    example: 2.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  fee_percentage?: number;
}

export class DateRangeDto {
  @ApiProperty({
    description: 'Data inicial',
    example: '2025-01-01',
  })
  @IsString()
  start_date: string;

  @ApiProperty({
    description: 'Data final',
    example: '2025-12-31',
  })
  @IsString()
  end_date: string;
}

export class MerchantRevenueFilterDto extends DateRangeDto {
  @ApiPropertyOptional({
    description: 'ID do comerciante (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  merchant_id?: string;
}

export class AdminMetricsDto {
  @ApiProperty({
    description: 'Volume total hoje',
    example: 10000.00
  })
  today_volume: number;

  @ApiProperty({
    description: 'Volume últimos 30 dias',
    example: 150000.00
  })
  last_30_days_volume: number;

  @ApiProperty({
    description: 'Taxa de chargeback em 30 dias (%)',
    example: 0.5
  })
  chargeback_rate: number;

  @ApiProperty({
    description: 'Volume total de transações',
    example: 500
  })
  total_transactions: number;

  @ApiProperty({
    description: 'Total de transações bem sucedidas',
    example: 485
  })
  successful_transactions: number;

  @ApiProperty({
    description: 'Total de chargebacks',
    example: 15
  })
  total_chargebacks: number;
}

export class MerchantRevenueDto {
  @ApiProperty({
    description: 'Nome do lojista',
    example: 'Empresa Exemplo LTDA'
  })
  merchant_name: string;

  @ApiProperty({
    description: 'Volume total',
    example: 50000.00
  })
  total_volume: number;

  @ApiProperty({
    description: 'Receita total',
    example: 1000.00
  })
  total_revenue: number;

  @ApiProperty({
    description: 'Total de transações',
    example: 200
  })
  total_transactions: number;

  @ApiProperty({
    description: 'Ticket médio',
    example: 250.00
  })
  average_ticket: number;
}

export class UpdateDocumentStatusDto {
  @ApiProperty({
    description: 'Status do documento',
    example: 'approved',
    enum: ['approved', 'rejected']
  })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Motivo da rejeição',
    example: 'Documento ilegível'
  })
  @IsString()
  @IsOptional()
  rejection_reason?: string;
}

export class UpdateDocumentsStatusDto {
  @ApiProperty({
    description: 'IDs dos documentos',
    example: ['contract', 'cnpj', 'identity', 'selfie', 'bank'],
    enum: ['contract', 'cnpj', 'identity', 'selfie', 'bank']
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(['contract', 'cnpj', 'identity', 'selfie', 'bank'], { each: true })
  document_ids: string[];

  @ApiProperty({
    description: 'Status dos documentos',
    example: 'approved',
    enum: ['approved', 'rejected']
  })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Motivo da rejeição',
    example: 'Documentos ilegíveis'
  })
  @IsString()
  @IsOptional()
  rejection_reason?: string;
}