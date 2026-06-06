import { Injectable } from '@nestjs/common';
import { AttendanceRecord, AttendanceStatus, RoleName } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { DomainEventBus } from 'src/common/events/event-bus';
import { EventKey } from 'src/common/events/domain-events';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { AttendanceRepository } from './repositories/attendance.repository';
import { RegularisationRepository } from './repositories/regularisation.repository';
import { WorkTimeCalculator } from './work-time.calculator';
import {
  AttendanceRangeQueryDto,
  CheckInDto,
  DecisionDto,
  RegularisationRequestDto,
} from './dto/attendance.dto';

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendance: AttendanceRepository,
    private readonly regularisations: RegularisationRepository,
    private readonly employees: EmployeeRepository,
    private readonly bus: DomainEventBus,
  ) {}

  async checkIn(user: AuthUser, dto: CheckInDto): Promise<AttendanceRecord> {
    const employeeId = await this.selfEmployeeId(user);
    const today = dateOnly(new Date());
    const existing = await this.attendance.findByDate(employeeId, today);
    if (existing?.checkInAt) {
      throw new ConflictError('Already checked in today', 'ALREADY_CHECKED_IN');
    }
    const now = new Date();
    return this.attendance.upsert(
      user.companyId,
      employeeId,
      today,
      {
        companyId: user.companyId,
        employee: { connect: { id: employeeId } },
        date: today,
        checkInAt: now,
        workMode: dto.workMode ?? 'ONSITE',
        status: AttendanceStatus.PRESENT,
        source: 'WEB',
      },
      { checkInAt: now, workMode: dto.workMode ?? 'ONSITE', status: AttendanceStatus.PRESENT },
    );
  }

  async checkOut(user: AuthUser): Promise<AttendanceRecord> {
    const employeeId = await this.selfEmployeeId(user);
    const today = dateOnly(new Date());
    const record = await this.attendance.findByDate(employeeId, today);
    if (!record || !record.checkInAt) {
      throw new UnprocessableError('You have not checked in today', 'NOT_CHECKED_IN');
    }
    const now = new Date();
    const minutes = WorkTimeCalculator.workedMinutes(record.checkInAt, now);
    return this.attendance.update(record.id, {
      checkOutAt: now,
      workedMinutes: minutes,
      status: WorkTimeCalculator.deriveStatus(minutes),
    });
  }

  async listRange(user: AuthUser, query: AttendanceRangeQueryDto): Promise<AttendanceRecord[]> {
    const employeeId = await this.resolveTargetEmployee(user, query.employeeId);
    return this.attendance.rangeForEmployee(
      user.companyId,
      employeeId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  async requestRegularisation(user: AuthUser, dto: RegularisationRequestDto) {
    const employeeId = await this.selfEmployeeId(user);
    const date = new Date(dto.date);
    // Ensure an attendance row exists to attach the request to.
    let record = await this.attendance.findByDate(employeeId, date);
    if (!record) {
      record = await this.attendance.upsert(
        user.companyId,
        employeeId,
        date,
        {
          companyId: user.companyId,
          employee: { connect: { id: employeeId } },
          date,
          status: AttendanceStatus.ABSENT,
          source: 'WEB',
        },
        {},
      );
    }
    const request = await this.regularisations.create({
      companyId: user.companyId,
      requestedStatus: dto.requestedStatus,
      requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
      requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : null,
      reason: dto.reason,
      attendance: { connect: { id: record.id } },
    });

    // Notify the approver (the employee's manager), if any.
    const self = await this.employees.findById(user.companyId, employeeId);
    if (self?.managerId) {
      const manager = await this.employees.findById(user.companyId, self.managerId);
      if (manager) {
        this.bus.publish({
          key: EventKey.RegularisationRequested,
          companyId: user.companyId,
          recipient: manager.email,
          data: { firstName: manager.firstName, date: dto.date, employee: `${self.firstName} ${self.lastName}` },
        });
      }
    }
    return request;
  }

  async decide(user: AuthUser, id: string, dto: DecisionDto) {
    const request = await this.regularisations.findById(user.companyId, id);
    if (!request) {
      throw new NotFoundError('Regularisation request not found');
    }
    if (request.status !== 'PENDING') {
      throw new UnprocessableError('Request already decided', 'ALREADY_DECIDED');
    }
    const attendance = await this.attendance.findById(user.companyId, request.attendanceId);
    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }
    // Only the employee's manager or HR may decide.
    await this.assertCanDecide(user, attendance.employeeId);

    const approved = dto.decision === 'APPROVE';
    if (approved) {
      await this.attendance.update(attendance.id, {
        status: request.requestedStatus,
        ...(request.requestedCheckIn ? { checkInAt: request.requestedCheckIn } : {}),
        ...(request.requestedCheckOut ? { checkOutAt: request.requestedCheckOut } : {}),
      });
    }
    const updated = await this.regularisations.update(id, {
      status: approved ? 'APPROVED' : 'REJECTED',
      approverId: user.userId,
      decidedAt: new Date(),
    });

    const employee = await this.employees.findById(user.companyId, attendance.employeeId);
    if (employee) {
      this.bus.publish({
        key: EventKey.RegularisationDecided,
        companyId: user.companyId,
        recipient: employee.email,
        data: {
          firstName: employee.firstName,
          decision: approved ? 'approved' : 'rejected',
        },
      });
    }
    return updated;
  }

  listPendingRegularisations(user: AuthUser) {
    return this.regularisations.listPending(user.companyId);
  }

  async monthlySummary(user: AuthUser, employeeIdParam: string | undefined, month: number, year: number) {
    const employeeId = await this.resolveTargetEmployee(user, employeeIdParam);
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    const records = await this.attendance.rangeForEmployee(user.companyId, employeeId, from, to);
    const summary: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0,
      HOLIDAY: 0,
      WEEKLY_OFF: 0,
    };
    let workedMinutes = 0;
    for (const r of records) {
      summary[r.status] = (summary[r.status] ?? 0) + 1;
      workedMinutes += r.workedMinutes;
    }
    const paidDays = summary.PRESENT + summary.ON_LEAVE + summary.HOLIDAY + summary.HALF_DAY * 0.5;
    return { month, year, employeeId, summary, workedMinutes, paidDays };
  }

  // ---- helpers ----
  private async selfEmployeeId(user: AuthUser): Promise<string> {
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (!self) {
      throw new UnprocessableError('Your user is not linked to an employee record', 'NO_EMPLOYEE');
    }
    return self.id;
  }

  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private async resolveTargetEmployee(user: AuthUser, employeeId?: string): Promise<string> {
    if (!employeeId) {
      return this.selfEmployeeId(user);
    }
    if (this.hasHrAccess(user)) {
      return employeeId;
    }
    // Managers may view their reports; others only themselves.
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (self?.id === employeeId) return employeeId;
    const target = await this.employees.findById(user.companyId, employeeId);
    if (user.roles.includes(RoleName.MANAGER) && target?.managerId === self?.id) {
      return employeeId;
    }
    throw new ForbiddenError('Not allowed to view this employee');
  }

  private async assertCanDecide(user: AuthUser, employeeId: string): Promise<void> {
    if (this.hasHrAccess(user)) return;
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    const target = await this.employees.findById(user.companyId, employeeId);
    if (user.roles.includes(RoleName.MANAGER) && target?.managerId === self?.id) return;
    throw new ForbiddenError('Only the manager or HR can decide this request');
  }
}
