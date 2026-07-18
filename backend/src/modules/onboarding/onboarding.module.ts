import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingRepository } from './onboarding.repository';

@Module({
  imports: [EmployeesModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRepository],
})
export class OnboardingModule {}
