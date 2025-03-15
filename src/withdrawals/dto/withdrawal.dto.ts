import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Valor do saque',
    example: 1000.00,
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
    description: 'Chave PIX para recebimento',
    example: 'exemplo@email.com',
  })
  @IsString()
  pix_key: string;

  @ApiPropertyOptional({
    description: 'Observações',
    example: 'Saque mensal',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateWithdrawalStatusDto {
  @ApiProperty({
    description: 'Status do saque',
    example: 'completed',
    enum: ['processing', 'completed', 'failed'],
  })
  @IsString()
  status: 'processing' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Processado com sucesso',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}