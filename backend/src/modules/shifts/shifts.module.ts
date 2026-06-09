import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ShiftsRepository } from './shifts.repository';

@Module({
  imports: [EmployeesModule],
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsRepository],
})
export class ShiftsModule {}
