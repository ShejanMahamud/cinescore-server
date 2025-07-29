import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AccountVerifyDto, LoginUserDto, RegisterUserDto } from './dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('register')
  register(@Body() dto: RegisterUserDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  @Post('verify-account')
  verifyAccount(@Body() dto: AccountVerifyDto) {
    return this.authService.validateAccountVerifyEmail(dto);
  }

  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @Post('refresh-token')
  refreshToken(dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }
}
