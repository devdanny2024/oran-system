import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../../infrastructure/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private getJwtConfig() {
    const secret = this.config.get<string>('JWT_SECRET');
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return { secret, expiresIn };
  }

  private signToken(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const { secret, expiresIn } = this.getJwtConfig();

    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      secret as jwt.Secret,
      { expiresIn } as SignOptions,
    );
  }

  private mapUser(user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  async register(payload: RegisterDto) {
    const email = payload.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const verificationToken = this.generateToken();

    const user = await this.prisma.user.create({
      data: {
        email,
        name: payload.name,
        passwordHash,
        verificationToken,
      },
    });

    await this.emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
    });

    await this.emailService.sendWelcomeEmail({
      to: user.email,
      name: user.name,
    });

    const token = this.signToken(user);

    return {
      user: this.mapUser(user),
      token,
    };
  }

  async login(payload: LoginDto) {
    const email = payload.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in.',
      );
    }

    const token = this.signToken(user);

    return {
      user: this.mapUser(user),
      token,
    };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        verificationToken: null,
      },
    });

    const jwtToken = this.signToken(updated);

    return {
      user: this.mapUser(updated),
      token: jwtToken,
      message: 'Email verified successfully.',
    };
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const email = payload.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Do not reveal whether the email exists.
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = this.generateToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(payload: ResetPasswordDto) {
    if (!payload.token) {
      throw new BadRequestException('Reset token is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: payload.token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    const token = this.signToken(updated);

    return {
      user: this.mapUser(updated),
      token,
      message: 'Password reset successfully.',
    };
  }
}
