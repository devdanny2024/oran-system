import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { ProductsModule } from '../products/products.module';
import { OperationsModule } from '../operations/operations.module';
import { QuotesModule } from '../quotes/quotes.module';
import { AgreementsModule } from '../agreements/agreements.module';
import { PaymentPlanModule } from '../payment-plan/payment-plan.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AwsModule } from '../../infrastructure/aws/aws.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AwsModule,
    CacheModule,
    EmailModule,
    AiModule,
    AuthModule,
    ProjectsModule,
    OnboardingModule,
    ProductsModule,
    OperationsModule,
    QuotesModule,
    AgreementsModule,
    PaymentPlanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
