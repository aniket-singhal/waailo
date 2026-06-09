import { Injectable } from '@nestjs/common';
import { NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { ShiftsRepository } from './shifts.repository';
import { AssignShiftDto, CreateShiftDto } from './dto/shifts.dto';

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class ShiftsService {
  constructor(
    private readonly repo: ShiftsRepository,
    private readonly employees: EmployeeRepository,
  ) {}

  createShift(companyId: string, dto: CreateShiftDto) {
    return this.repo.createShift({
      companyId,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      workingDays: dto.workingDays ?? '1,2,3,4,5',
    });
  }

  listShifts(companyId: string) {
    return this.repo.listShifts(companyId);
  }

  async assign(companyId: string, dto: AssignShiftDto) {
    const shift = await this.repo.findShift(companyId, dto.shiftId);
    if (!shift) throw new NotFoundError('Shift not found');
    const employee = await this.employees.findById(companyId, dto.employeeId);
    if (!employee) throw new UnprocessableError('Employee not found', 'EMPLOYEE_NOT_FOUND');
    return this.repo.createAssignment({
      companyId,
      employeeId: dto.employeeId,
      shiftId: dto.shiftId,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });
  }

  listAssignments(companyId: string, employeeId?: string) {
    return this.repo.listAssignments(companyId, employeeId);
  }

  async myShift(user: AuthUser) {
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (!self) {
      throw new UnprocessableError('Your user is not linked to an employee record', 'NO_EMPLOYEE');
    }
    const assignment = await this.repo.currentAssignment(user.companyId, self.id, dateOnly(new Date()));
    return { assignment, shift: assignment?.shift ?? null };
  }
}
