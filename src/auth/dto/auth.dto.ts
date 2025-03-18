import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'comerciante@exemplo.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password: string;
}

export class RegisterDto extends LoginDto {}

export class AdminLoginDto extends LoginDto {}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Senha atual',
    example: 'senha123',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'Nova senha',
    example: 'novaSenha123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'A senha deve conter letras maiúsculas, minúsculas e números',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'novaSenha123',
  })
  @IsString()
  confirmPassword: string;
}