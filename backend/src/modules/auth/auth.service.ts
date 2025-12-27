import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(payload: RegisterDto) {
    return {
      message: 'Register not yet implemented',
      payload,
    };
  }

  async login(payload: LoginDto) {
    return {
      message: 'Login not yet implemented',
      payload,
    };
  }
}
