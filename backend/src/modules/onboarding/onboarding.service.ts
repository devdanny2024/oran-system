import { Injectable } from '@nestjs/common';
import { StartOnboardingDto } from './dto/start-onboarding.dto';

@Injectable()
export class OnboardingService {
  async start(payload: StartOnboardingDto) {
    return {
      message: 'Start onboarding not yet implemented',
      payload,
    };
  }

  async getByProject(projectId: string) {
    return {
      message: 'Get onboarding not yet implemented',
      projectId,
    };
  }
}

