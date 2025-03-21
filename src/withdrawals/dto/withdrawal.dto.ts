import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, Min, IsEnum } from 'class-validator';

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
    description: 'Tipo da chave PIX',
    example: 'cpf',
    enum: ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']
  })
  @IsEnum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'])
  pix_key_type: string;

  @ApiProperty({
    description: 'Chave PIX',
    example: 'exemplo@email.com',
  })
  @IsString()
  pix_key: string;

  // Removendo o user_id pois ele não deve vir do frontend
  // O merchantId já é passado na URL
}

export class UpdateWithdrawalStatusDto {
  @ApiProperty({
    description: 'Status do saque',
    example: 'approved',
    enum: ['approved', 'rejected'],
  })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Motivo da rejeição',
    example: 'Dados incorretos',
  })
  @IsString()
  @IsOptional()
  rejection_reason?: string;
}

export class WithdrawalResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: '2025-03-17T10:00:00Z' })
  created_at: string;

  @ApiProperty({ example: 1000.00 })
  amount: number;

  @ApiProperty({ example: 993.01 })
  net_amount: number;

  @ApiProperty({ example: 6.99 })
  fee_amount: number;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 'cpf' })
  pix_key_type: string;

  @ApiProperty({ example: '123.456.789-00' })
  pix_key: string;
}
