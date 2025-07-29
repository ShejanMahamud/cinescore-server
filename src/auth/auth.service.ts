import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma';
import { Util } from 'src/utils/util';
import { AccountVerifyDto, LoginUserDto, RegisterUserDto } from './dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterUserDto, req: Request) {
    const hashedPassword = await Util.hash(dto.password);
    const verifyToken = Util.generateBytes();
    const verifyTokenExp = new Date(Date.now() + 1000 * 60 * 15);

    const result = await this.prisma.$transaction(async (tx) => {
      const isExistUser = await tx.user.findUnique({
        where: {
          email: dto.email,
        },
      });
      if (isExistUser) {
        throw new BadRequestException('User already exists');
      }
      const user = await tx.user.create({
        data: {
          ...dto,
          password: hashedPassword,
          verifyToken: await Util.hash(verifyToken),
          verifyTokenExp,
        },
      });
      return user;
    });
    await this.mailService.sendAccountVerifyEmail({
      to: result.email,
      userName: result.username,
      verificationLink: `${req.protocol}://${req.get('host')}/token=${verifyToken}/uid=${result.id}`,
      year: new Date().getFullYear(),
    });
    return {
      success: true,
      message: 'User registration successful',
    };
  }

  async validateAccountVerifyEmail(dto: AccountVerifyDto) {
    await this.prisma.$transaction(async (tx) => {
      const isUserExist = await tx.user.findUnique({
        where: {
          id: dto.uid,
        },
        select: {
          id: true,
          verifyToken: true,
          verifyTokenExp: true,
        },
      });
      if (
        !isUserExist ||
        !isUserExist.verifyToken ||
        !isUserExist.verifyTokenExp
      ) {
        throw new NotFoundException('User not exist');
      }
      const isMatched = await Util.match(
        isUserExist.verifyToken,
        dto.verifyToken,
      );
      if (!isMatched) {
        throw new BadRequestException('Tokens are not matched');
      }
      const isExpired = new Date() > isUserExist.verifyTokenExp;
      if (isExpired) {
        throw new BadRequestException('Token is expired');
      }
      const updatedUser = await tx.user.update({
        where: {
          id: isUserExist.id,
        },
        data: {
          emailVerified: true,
          verifyToken: null,
          verifyTokenExp: null,
        },
      });
      return updatedUser;
    });
    return { success: true, message: 'Account email verified' };
  }

  async login(dto: LoginUserDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          email: dto.email,
          emailVerified: true,
          isDeleted: false,
        },
        select: {
          password: true,
          email: true,
          id: true,
        },
      });
      if (!user) {
        throw new NotFoundException('User not found!');
      }
      const isMatched = await Util.match(user.password, dto.password);
      if (!isMatched) {
        throw new BadRequestException('Credentials not valid');
      }
      const tokens = await this.generateTokens({
        email: user.email,
        sub: user.id,
      });
      const hashedToken = await Util.hash(tokens.refresh_token);
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          refreshToken: hashedToken,
          resetTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
      });
      return tokens.access_token;
    });
    return {
      success: true,
      message: 'Login Successful!',
      data: {
        accessToken: result,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: dto.id,
          isDeleted: false,
          emailVerified: true,
        },
        select: {
          refreshToken: true,
          refreshTokenExp: true,
          email: true,
          id: true,
        },
      });
      if (!user || !user.refreshToken || !user.refreshTokenExp) {
        throw new NotFoundException('User or refresh token not found');
      }
      const isMatched = await Util.match(user.refreshToken, dto.token);
      const isExpired = new Date() > user.refreshTokenExp;
      if (!isMatched || isExpired) {
        throw new BadRequestException('Tokens are not matched or expired');
      }
      await this.jwtService.verify(dto.token, {
        secret: this.config.get('REFRESH_SECRET') as string,
      });
      const tokens = await this.generateTokens({
        email: user.email,
        sub: user.id,
      });
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          refreshToken: tokens.refresh_token,
          refreshTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
      });
      return tokens.access_token;
    });
    return {
      success: true,
      message: 'New Access token revoked!',
      data: {
        access_token: result,
      },
    };
  }

  async resendAccountVerification(email: string, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          email: email,
          emailVerified: false,
          isDeleted: false,
        },
        select: {
          verifyToken: true,
          verifyTokenExp: true,
          id: true,
          email: true,
          username: true,
        },
      });
      if (!user || !user.verifyToken || !user.verifyTokenExp) {
        throw new NotFoundException('User not found or already verified');
      }
      const isExpired = new Date() > user.verifyTokenExp;
      if (!isExpired) {
        throw new BadRequestException(
          'Token is valid right now. no need to request new',
        );
      }
      const verifyToken = await Util.hash(Util.generateBytes());
      const verifyTokenExp = new Date(Date.now() + 1000 * 60 * 15);

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          verifyToken,
          verifyTokenExp,
        },
      });
      await this.mailService.sendAccountVerifyEmail({
        to: user.email,
        userName: user.username,
        verificationLink: `${req.protocol}://${req.get('host')}/token=${verifyToken}/uid=${user.id}`,
        year: new Date().getFullYear(),
      });
      return true;
    });
    return {
      success: true,
      message: 'Verification email sent!',
    };
  }

  async generateTokens(data: { email: string; sub: string }) {
    const accessToken = this.jwtService.sign(
      { email: data.email, sub: data.sub },
      {
        secret: this.config.get('ACCESS_SECRET'),
        expiresIn: this.config.get('ACCESS_EXPIRES'),
      },
    );
    const refreshToken = this.jwtService.sign(
      { email: data.email, sub: data.sub },
      {
        secret: this.config.get('REFRESH_SECRET'),
        expiresIn: this.config.get('REFRESH_EXPIRES'),
      },
    );
    const [access_token, refresh_token] = await Promise.all([
      accessToken,
      refreshToken,
    ]);
    return { access_token, refresh_token };
  }
}
