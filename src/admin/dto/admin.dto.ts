import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, Min, Max } from 'class-validator';

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
  fee_percentage: number;
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
  rejection_reason?: string;
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