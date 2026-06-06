import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { HolidaysModule } from 'src/modules/holidays/holidays.module';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { LeaveTypeRepository } from './repositories/leave-type.repository';
import { LeaveBalanceRepository } from './repositories/leave-balance.repository';
import { LeaveRequestRepository } from './repositories/leave-request.repository';

@Module({
  imports: [EmployeesModule, HolidaysModule],
  controllers: [LeavesController],
  providers: [LeavesService, LeaveTypeRepository, LeaveBalanceRepository, LeaveRequestRepository],
})
export class LeavesModule {}
