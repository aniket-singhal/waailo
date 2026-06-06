import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeRepository } from './repositories/employee.repository';
import { SalaryRepository } from './repositories/salary.repository';

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeRepository, SalaryRepository],
  exports: [EmployeesService, EmployeeRepository, SalaryRepository],
})
export class EmployeesModule {}
