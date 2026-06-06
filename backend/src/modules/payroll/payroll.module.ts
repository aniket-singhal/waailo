import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { AttendanceModule } from 'src/modules/attendance/attendance.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRunRepository } from './repositories/payroll-run.repository';
import { PayslipRepository } from './repositories/payslip.repository';
import { StatutoryRateRepository } from './repositories/statutory-rate.repository';

@Module({
  imports: [EmployeesModule, AttendanceModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRunRepository, PayslipRepository, StatutoryRateRepository],
})
export class PayrollModule {}
