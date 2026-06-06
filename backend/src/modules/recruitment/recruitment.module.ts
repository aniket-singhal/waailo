import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentRepository } from './recruitment.repository';

@Module({
  imports: [EmployeesModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService, RecruitmentRepository],
})
export class RecruitmentModule {}
