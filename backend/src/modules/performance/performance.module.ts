import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceRepository } from './performance.repository';

@Module({
  imports: [EmployeesModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, PerformanceRepository],
})
export class PerformanceModule {}
