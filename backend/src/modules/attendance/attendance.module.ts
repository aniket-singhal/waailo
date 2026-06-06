import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { RegularisationRepository } from './repositories/regularisation.repository';

@Module({
  imports: [EmployeesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, RegularisationRepository],
  exports: [AttendanceRepository],
})
export class AttendanceModule {}
