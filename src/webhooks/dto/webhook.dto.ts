import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class OnzWebhookDto {
  @ApiProperty({
    description: 'ID da transação',
    example: '195bf953-91d8-4a1d-8d45-65d4cc15bb12'
  })
  @IsString()
  txid: string;

  @ApiProperty({
    description: 'Valor do pagamento',
    example: '5.00'
  })
  @IsString()
  valor: string;

  @ApiProperty({
    description: 'Data e hora do pagamento',
    example: '2025-03-19 03:34:47.466+00'
  })
  @IsString()
  horario: string;

  @ApiProperty({
    description: 'ID único end-to-end da transação',
    example: 'E12345678202009091221abcdef12345'
  })
  @IsString()
  endToEndId: string;

  @ApiProperty({
    description: 'Informações do pagador',
    example: {
      cpf: '12345678900',
      nome: 'VITOR'
    }
  })
  @IsObject()
  @IsOptional()
  pagador?: {
    cpf?: string;
    nome?: string;
  };
}
