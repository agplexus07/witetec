import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

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