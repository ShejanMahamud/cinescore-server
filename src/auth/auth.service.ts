import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma';
import { Util } from 'src/utils/util';
import { AccountVerifyDto, RegisterUserDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
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
}
