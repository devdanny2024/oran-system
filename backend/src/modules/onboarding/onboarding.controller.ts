import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { StartOnboardingDto } from './dto/start-onboarding.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  start(@Body() payload: StartOnboardingDto) {
    return this.onboardingService.start(payload);
  }

  @Get(':projectId')
  getByProject(@Param('projectId') projectId: string) {
    return this.onboardingService.getByProject(projectId);
  }
}

