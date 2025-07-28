import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AccountVerifyDto, RegisterUserDto } from './dto';

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
}
