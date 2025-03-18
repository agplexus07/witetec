import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, Min, IsDateString } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Valor da transação',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'ID do comerciante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  merchant_id: string;

  @ApiProperty({
    description: 'Chave PIX do destinatário',
    example: 'exemplo@email.com',
  })
  @IsString()
  pix_key: string;

  @ApiPropertyOptional({
    description: 'Descrição da transação',
    example: 'Pagamento de produto',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID único da transação',
    example: 'TRX123456789',
  })
  @IsString()
  transaction_id: string;

  @ApiPropertyOptional({
    description: 'Informações do cliente',
    example: { name: 'João Silva', email: 'joao@email.com' }
  })
  @IsOptional()
  customer_info?: Record<string, any>;
}

export class CreatePixDto {
  @ApiProperty({
    description: 'Valor do PIX',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Descrição do pagamento',
    example: 'Pagamento de produto',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Informações do pagador',
    example: { 
      name: 'João Silva', 
      document: '123.456.789-00',
      email: 'joao@email.com'
    }
  })
  @IsOptional()
  payer_info?: Record<string, any>;
}

export class TransactionListQueryDto {
  @ApiPropertyOptional({
    description: 'Data inicial',
    example: '2025-01-01'
  })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data final',
    example: '2025-12-31'
  })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Status da transação',
    example: 'completed',
    enum: ['pending', 'completed', 'failed', 'chargeback']
  })
  @IsString()
  @IsOptional()
  status?: 'pending' | 'completed' | 'failed' | 'chargeback';
}

export class TransactionResponseDto {
  @ApiProperty({
    description: 'ID da transação',
    example: 'uuid'
  })
  id: string;

  @ApiProperty({
    description: 'Data da transação',
    example: '2025-01-01T10:00:00Z'
  })
  created_at: string;

  @ApiProperty({
    description: 'Informações do cliente',
    example: { name: 'João Silva', email: 'joao@email.com' }
  })
  customer_info: Record<string, any>;

  @ApiProperty({
    description: 'Valor da transação',
    example: 100.50
  })
  amount: number;

  @ApiProperty({
    description: 'Status da transação',
    example: 'completed',
    enum: ['pending', 'completed', 'failed', 'chargeback']
  })
  status: string;
}

export class TransactionDetailsDto extends TransactionResponseDto {
  @ApiProperty({
    description: 'Valor da taxa',
    example: 2.99
  })
  fee_amount: number;

  @ApiProperty({
    description: 'Valor líquido',
    example: 97.51
  })
  net_amount: number;

  @ApiProperty({
    description: 'Chave PIX',
    example: 'exemplo@email.com'
  })
  pix_key: string;

  @ApiProperty({
    description: 'Dados do PIX',
    example: {
      qr_code: 'string',
      qr_code_image: 'url',
      payment_link: 'url',
      expires_at: '2025-01-01T11:00:00Z'
    }
  })
  pix_data: Record<string, any>;

  @ApiProperty({
    description: 'Descrição',
    example: 'Pagamento de produto'
  })
  description: string;
}

export class UpdateTransactionStatusDto {
  @ApiProperty({
    description: 'Status da transação',
    example: 'completed',
    enum: ['completed', 'failed', 'chargeback'],
  })
  @IsString()
  status: 'completed' | 'failed' | 'chargeback';
}