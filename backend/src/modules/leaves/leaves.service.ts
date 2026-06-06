import { Injectable } from '@nestjs/common';
import { LeaveBalance, LeaveRequest, RoleName } from '@prisma/client';
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
import { HolidaysService } from 'src/modules/holidays/holidays.service';
import { LeaveTypeRepository } from './repositories/leave-type.repository';
import { LeaveBalanceRepository } from './repositories/leave-balance.repository';
import { LeaveRequestRepository } from './repositories/leave-request.repository';
import { LeaveCalculator } from './leave.calculator';
import {
  ApplyLeaveDto,
  CreateLeavePolicyDto,
  CreateLeaveTypeDto,
  LeaveDecisionDto,
} from './dto/leave.dto';

@Injectable()
export class LeavesService {
  constructor(
    private readonly types: LeaveTypeRepository,
    private readonly balances: LeaveBalanceRepository,
    private readonly requests: LeaveRequestRepository,
    private readonly employees: EmployeeRepository,
    private readonly holidays: HolidaysService,
    private readonly bus: DomainEventBus,
  ) {}

  // ---- configuration ----
  listTypes(companyId: string) {
    return this.types.list(companyId);
  }

  async createType(companyId: string, dto: CreateLeaveTypeDto) {
    try {
      return await this.types.create({
        companyId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        isPaid: dto.isPaid ?? true,
        color: dto.color,
      });
    } catch (e) {
      if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
        throw new ConflictError('A leave type with this code already exists', 'LEAVE_TYPE_EXISTS');
      }
      throw e;
    }
  }

  async createPolicy(companyId: string, dto: CreateLeavePolicyDto) {
    const type = await this.types.findById(companyId, dto.leaveTypeId);
    if (!type) throw new NotFoundError('Leave type not found');
    return this.types.createPolicy({
      companyId,
      leaveTypeId: dto.leaveTypeId,
      annualQuota: dto.annualQuota,
      maxCarryForward: dto.maxCarryForward ?? 0,
      minPerRequest: dto.minPerRequest ?? 0.5,
      maxPerRequest: dto.maxPerRequest ?? null,
      effectiveFrom: new Date(dto.effectiveFrom),
    });
  }

  // ---- application workflow ----
  async apply(user: AuthUser, dto: ApplyLeaveDto): Promise<LeaveRequest> {
    const employee = await this.requireSelf(user);
    const type = await this.types.findById(user.companyId, dto.leaveTypeId);
    if (!type) throw new NotFoundError('Leave type not found');
    const policy = await this.types.activePolicy(user.companyId, dto.leaveTypeId);
    if (!policy) throw new UnprocessableError('No policy configured for this leave type', 'NO_POLICY');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end.getTime() < start.getTime()) {
      throw new UnprocessableError('End date is before start date', 'INVALID_RANGE');
    }

    const holidayKeys = await this.holidayKeys(user.companyId, employee.locationId, start, end);
    const days = LeaveCalculator.workingDays(start, end, holidayKeys);
    if (days <= 0) {
      throw new UnprocessableError('Selected range has no working days', 'NO_WORKING_DAYS');
    }
    if (days < policy.minPerRequest) {
      throw new UnprocessableError(`Minimum ${policy.minPerRequest} day(s) per request`, 'BELOW_MIN');
    }
    if (policy.maxPerRequest && days > policy.maxPerRequest) {
      throw new UnprocessableError(`Maximum ${policy.maxPerRequest} day(s) per request`, 'ABOVE_MAX');
    }

    // Overlap check against pending/approved requests.
    const active = await this.requests.activeForEmployee(user.companyId, employee.id);
    const overlaps = active.some((r) =>
      LeaveCalculator.hasOverlap(start, end, r.startDate, r.endDate),
    );
    if (overlaps) {
      throw new ConflictError('Overlaps an existing leave request', 'LEAVE_OVERLAP');
    }

    const periodYear = start.getUTCFullYear();
    const balance = await this.ensureBalance(user.companyId, employee.id, type.id, periodYear, policy.annualQuota);
    const available = balance.accrued - balance.used - balance.pending;
    if (days > available) {
      throw new UnprocessableError(
        `Insufficient balance: requested ${days}, available ${available}`,
        'LEAVE_INSUFFICIENT_BALANCE',
      );
    }

    // Reserve and create.
    await this.balances.adjust(balance.id, { pending: days });
    const request = await this.requests.create({
      companyId: user.companyId,
      employee: { connect: { id: employee.id } },
      leaveType: { connect: { id: type.id } },
      startDate: start,
      endDate: end,
      days,
      reason: dto.reason,
      status: 'PENDING',
    });

    if (employee.managerId) {
      const manager = await this.employees.findById(user.companyId, employee.managerId);
      if (manager) {
        this.bus.publish({
          key: EventKey.LeaveRequested,
          companyId: user.companyId,
          recipient: manager.email,
          data: {
            firstName: manager.firstName,
            employee: `${employee.firstName} ${employee.lastName}`,
            startDate: dto.startDate,
            endDate: dto.endDate,
            days,
          },
        });
      }
    }
    return request;
  }

  async decide(user: AuthUser, id: string, dto: LeaveDecisionDto): Promise<LeaveRequest> {
    const request = await this.requests.findById(user.companyId, id);
    if (!request) throw new NotFoundError('Leave request not found');
    if (request.status !== 'PENDING') {
      throw new UnprocessableError('Request already decided', 'ALREADY_DECIDED');
    }
    await this.assertCanDecide(user, request.employeeId);

    const balance = await this.balances.find(
      request.employeeId,
      request.leaveTypeId,
      request.startDate.getUTCFullYear(),
    );
    const approved = dto.decision === 'APPROVE';
    if (balance) {
      if (approved) {
        await this.balances.adjust(balance.id, { pending: -request.days, used: request.days });
      } else {
        await this.balances.adjust(balance.id, { pending: -request.days });
      }
    }
    const updated = await this.requests.update(id, {
      status: approved ? 'APPROVED' : 'REJECTED',
      approverId: user.userId,
      decidedAt: new Date(),
      decisionNote: dto.note,
    });

    const employee = await this.employees.findById(user.companyId, request.employeeId);
    if (employee) {
      this.bus.publish({
        key: EventKey.LeaveDecided,
        companyId: user.companyId,
        recipient: employee.email,
        data: {
          firstName: employee.firstName,
          decision: approved ? 'approved' : 'rejected',
          startDate: request.startDate.toISOString().slice(0, 10),
          endDate: request.endDate.toISOString().slice(0, 10),
        },
      });
    }
    return updated;
  }

  async cancel(user: AuthUser, id: string): Promise<LeaveRequest> {
    const request = await this.requests.findById(user.companyId, id);
    if (!request) throw new NotFoundError('Leave request not found');
    const self = await this.requireSelf(user);
    if (request.employeeId !== self.id) {
      throw new ForbiddenError('You can only cancel your own leave');
    }
    if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
      throw new UnprocessableError('Only pending or approved leave can be cancelled', 'NOT_CANCELLABLE');
    }
    const balance = await this.balances.find(
      request.employeeId,
      request.leaveTypeId,
      request.startDate.getUTCFullYear(),
    );
    if (balance) {
      if (request.status === 'PENDING') {
        await this.balances.adjust(balance.id, { pending: -request.days });
      } else {
        await this.balances.adjust(balance.id, { used: -request.days });
      }
    }
    return this.requests.update(id, { status: 'CANCELLED' });
  }

  // ---- reads ----
  async getBalances(user: AuthUser, employeeIdParam: string | undefined, yearParam?: number) {
    const employee = await this.resolveTarget(user, employeeIdParam);
    const year = yearParam ?? new Date().getUTCFullYear();
    // Seed a balance row per leave type that has a policy, so balances always show.
    const types = await this.types.list(user.companyId);
    for (const t of types) {
      const policy = await this.types.activePolicy(user.companyId, t.id);
      if (policy) {
        await this.ensureBalance(user.companyId, employee.id, t.id, year, policy.annualQuota);
      }
    }
    const balances = await this.balances.listForEmployee(user.companyId, employee.id, year);
    return balances.map((b) => this.toBalanceDto(b));
  }

  async listRequests(user: AuthUser, statusFilter?: string) {
    const filter: { employeeId?: string; status?: LeaveRequest['status'] } = {};
    if (!this.hasHrAccess(user)) {
      const self = await this.employees.findByUserId(user.companyId, user.userId);
      filter.employeeId = self?.id ?? '__none__';
    }
    if (statusFilter) filter.status = statusFilter as LeaveRequest['status'];
    return this.requests.list(user.companyId, filter);
  }

  listPending(user: AuthUser) {
    return this.requests.listPending(user.companyId);
  }

  async calendar(user: AuthUser, from: string, to: string) {
    return this.requests.inRange(user.companyId, new Date(from), new Date(to));
  }

  // ---- helpers ----
  private async ensureBalance(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    periodYear: number,
    entitled: number,
  ): Promise<LeaveBalance> {
    return this.balances.upsertEntitlement({ companyId, employeeId, leaveTypeId, periodYear, entitled });
  }

  private async holidayKeys(
    companyId: string,
    locationId: string | null,
    start: Date,
    end: Date,
  ): Promise<Set<string>> {
    const years = new Set([start.getUTCFullYear(), end.getUTCFullYear()]);
    const keys = new Set<string>();
    for (const y of years) {
      const holidays = await this.holidays.getEffectiveCalendar(companyId, locationId, y);
      for (const h of holidays) keys.add(h.date.toISOString().slice(0, 10));
    }
    return keys;
  }

  private async requireSelf(user: AuthUser) {
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (!self) {
      throw new UnprocessableError('Your user is not linked to an employee record', 'NO_EMPLOYEE');
    }
    return self;
  }

  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private async resolveTarget(user: AuthUser, employeeId?: string) {
    if (!employeeId) return this.requireSelf(user);
    if (this.hasHrAccess(user)) {
      const e = await this.employees.findById(user.companyId, employeeId);
      if (!e) throw new NotFoundError('Employee not found');
      return e;
    }
    const self = await this.requireSelf(user);
    if (self.id === employeeId) return self;
    const target = await this.employees.findById(user.companyId, employeeId);
    if (user.roles.includes(RoleName.MANAGER) && target?.managerId === self.id) return target;
    throw new ForbiddenError('Not allowed to view this employee');
  }

  private async assertCanDecide(user: AuthUser, employeeId: string): Promise<void> {
    if (this.hasHrAccess(user)) return;
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    const target = await this.employees.findById(user.companyId, employeeId);
    if (user.roles.includes(RoleName.MANAGER) && target?.managerId === self?.id) return;
    throw new ForbiddenError('Only the manager or HR can decide this request');
  }

  private toBalanceDto(b: LeaveBalance) {
    return {
      id: b.id,
      leaveTypeId: b.leaveTypeId,
      periodYear: b.periodYear,
      entitled: b.entitled,
      accrued: b.accrued,
      used: b.used,
      pending: b.pending,
      available: b.accrued - b.used - b.pending,
    };
  }
}
