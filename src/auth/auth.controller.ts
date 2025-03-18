import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AdminLoginDto, ChangePasswordDto } from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de usuário' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Login de administrador' })
  async adminLogin(@Body() loginDto: AdminLoginDto) {
    return this.authService.adminLogin(loginDto.email, loginDto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro de novo usuário' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto.email, registerDto.password);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Alterar senha' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obter perfil do usuário' })
  async getProfile() {
    return this.authService.getProfile();
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout' })
  async logout() {
    return this.authService.logout();
  }
}