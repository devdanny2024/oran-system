import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
      secret,
      { expiresIn },
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

  async register(payload: RegisterDto) {
    const email = payload.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: payload.name,
        passwordHash,
      },
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

    const token = this.signToken(user);

    return {
      user: this.mapUser(user),
      token,
    };
  }
}
