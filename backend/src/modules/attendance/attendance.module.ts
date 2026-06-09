import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { HolidaysModule } from 'src/modules/holidays/holidays.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { RegularisationRepository } from './repositories/regularisation.repository';

@Module({
  imports: [EmployeesModule, HolidaysModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, RegularisationRepository],
  exports: [AttendanceRepository],
})
export class AttendanceModule {}
