import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { OffboardingController } from './offboarding.controller';
import { OffboardingService } from './offboarding.service';
import { OffboardingRepository } from './offboarding.repository';

@Module({
  imports: [EmployeesModule],
  controllers: [OffboardingController],
  providers: [OffboardingService, OffboardingRepository],
})
export class OffboardingModule {}
