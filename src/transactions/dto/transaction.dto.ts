import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

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