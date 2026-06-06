import { Injectable, Logger } from '@nestjs/common';
import { Employee, Prisma, RoleName } from '@prisma/client';
import { Paginated, paginate } from 'src/common/dto/pagination.dto';
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { DomainEventBus } from 'src/common/events/event-bus';
import { EventKey } from 'src/common/events/domain-events';
import { UsersService } from 'src/modules/auth/users.service';
import { EmployeeRepository } from './repositories/employee.repository';
import { SalaryRepository } from './repositories/salary.repository';
import { canTransition } from './employee-lifecycle';
import {
  ChangeStatusDto,
  CreateEmployeeDto,
  EmployeeQueryDto,
  EmployeeResponseDto,
  InviteEmployeeDto,
  SalaryStructureDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employees: EmployeeRepository,
    private readonly salaries: SalaryRepository,
    private readonly users: UsersService,
    private readonly bus: DomainEventBus,
  ) {}

  async create(companyId: string, dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    await this.assertManagerValid(companyId, dto.managerId);
    const employeeCode = dto.employeeCode ?? (await this.nextEmployeeCode(companyId));
    try {
      const employee = await this.employees.create({
        company: { connect: { id: companyId } },
        employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        employmentType: dto.employmentType ?? 'FULL_TIME',
        dateOfJoining: new Date(dto.dateOfJoining),
        status: 'INVITED',
        ...this.relations(dto),
      });
      return this.toDto(employee);
    } catch (e) {
      throw this.asConflict(e, 'Employee code already exists', 'EMPLOYEE_CODE_EXISTS');
    }
  }

  /**
   * Creates the employee record plus an INVITED user, and returns the invite
   * token (delivered out-of-band in production via the Notifications module).
   */
  async invite(
    companyId: string,
    dto: InviteEmployeeDto,
  ): Promise<EmployeeResponseDto & { inviteToken: string }> {
    await this.assertManagerValid(companyId, dto.managerId);
    const role = dto.asManager ? RoleName.MANAGER : RoleName.EMPLOYEE;
    const { user, inviteToken } = await this.users.createInvited(companyId, dto.email, role);
    const employeeCode = dto.employeeCode ?? (await this.nextEmployeeCode(companyId));
    const employee = await this.employees.create({
      company: { connect: { id: companyId } },
      user: { connect: { id: user.id } },
      employeeCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      employmentType: dto.employmentType ?? 'FULL_TIME',
      dateOfJoining: new Date(dto.dateOfJoining),
      status: 'INVITED',
      ...this.relations(dto),
    });
    this.bus.publish({
      key: EventKey.EmployeeInvited,
      companyId,
      recipient: dto.email,
      data: { firstName: dto.firstName, inviteToken },
    });
    return { ...this.toDto(employee), inviteToken };
  }

  async get(companyId: string, id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employees.findById(companyId, id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return this.toDto(employee);
  }

  async list(user: AuthUser, query: EmployeeQueryDto): Promise<Paginated<EmployeeResponseDto>> {
    const filter = {
      status: query.status,
      departmentId: query.departmentId,
      search: query.search,
    } as { status?: Employee['status']; departmentId?: string; search?: string; managerId?: string };

    // Resource scoping by role (see docs/07 §7.2).
    if (!this.hasHrAccess(user)) {
      const self = await this.employees.findByUserId(user.companyId, user.userId);
      if (user.roles.includes(RoleName.MANAGER) && self) {
        filter.managerId = self.id;
      } else {
        // Plain employee: can only see themselves.
        const rows = self ? [self] : [];
        return paginate(rows.map((e) => this.toDto(e)), rows.length, 1, query.pageSize);
      }
    }

    const { rows, total } = await this.employees.search(
      user.companyId,
      filter,
      query.skip,
      query.take,
    );
    return paginate(rows.map((e) => this.toDto(e)), total, query.page, query.pageSize);
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    await this.getOrThrow(companyId, id);
    if (dto.managerId) {
      await this.assertManagerValid(companyId, dto.managerId, id);
    }
    const employee = await this.employees.update(id, {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.departmentId !== undefined
        ? { department: { connect: { id: dto.departmentId } } }
        : {}),
      ...(dto.designationId !== undefined
        ? { designation: { connect: { id: dto.designationId } } }
        : {}),
      ...(dto.locationId !== undefined ? { location: { connect: { id: dto.locationId } } } : {}),
      ...(dto.managerId !== undefined ? { manager: { connect: { id: dto.managerId } } } : {}),
    });
    return this.toDto(employee);
  }

  async setSalary(companyId: string, id: string, dto: SalaryStructureDto) {
    await this.getOrThrow(companyId, id);
    const sumComponents = dto.components.reduce((acc, c) => acc + c.amount, 0);
    if (sumComponents > dto.ctcAnnual) {
      throw new UnprocessableError(
        'Salary components exceed the annual CTC',
        'SALARY_COMPONENTS_EXCEED_CTC',
      );
    }
    return this.salaries.setActive(companyId, id, {
      ctcAnnual: dto.ctcAnnual,
      components: dto.components as unknown as Prisma.InputJsonValue,
      effectiveFrom: new Date(dto.effectiveFrom),
    });
  }

  async changeStatus(
    companyId: string,
    id: string,
    dto: ChangeStatusDto,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.getOrThrow(companyId, id);
    if (employee.status === dto.status) {
      return this.toDto(employee);
    }
    if (!canTransition(employee.status, dto.status)) {
      throw new UnprocessableError(
        `Cannot transition from ${employee.status} to ${dto.status}`,
        'INVALID_STATUS_TRANSITION',
      );
    }
    const updated = await this.employees.update(id, {
      status: dto.status,
      ...(dto.status === 'EXITED' ? { dateOfExit: new Date() } : {}),
    });
    return this.toDto(updated);
  }

  // ---- helpers ----
  private async getOrThrow(companyId: string, id: string): Promise<Employee> {
    const employee = await this.employees.findById(companyId, id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  private async assertManagerValid(
    companyId: string,
    managerId?: string,
    selfId?: string,
  ): Promise<void> {
    if (!managerId) {
      return;
    }
    if (selfId && managerId === selfId) {
      throw new UnprocessableError('An employee cannot be their own manager', 'MANAGER_IS_SELF');
    }
    const manager = await this.employees.findById(companyId, managerId);
    if (!manager) {
      throw new UnprocessableError('Manager not found in this company', 'MANAGER_NOT_FOUND');
    }
  }

  private async nextEmployeeCode(companyId: string): Promise<string> {
    const count = await this.employees.countForCompany(companyId);
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private relations(dto: CreateEmployeeDto) {
    return {
      ...(dto.departmentId ? { department: { connect: { id: dto.departmentId } } } : {}),
      ...(dto.designationId ? { designation: { connect: { id: dto.designationId } } } : {}),
      ...(dto.locationId ? { location: { connect: { id: dto.locationId } } } : {}),
      ...(dto.managerId ? { manager: { connect: { id: dto.managerId } } } : {}),
    };
  }

  private asConflict(e: unknown, message: string, code: string): Error {
    if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
      return new ConflictError(message, code);
    }
    return e as Error;
  }

  private toDto(e: Employee): EmployeeResponseDto {
    return {
      id: e.id,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone,
      employmentType: e.employmentType,
      status: e.status,
      dateOfJoining: e.dateOfJoining.toISOString().slice(0, 10),
      departmentId: e.departmentId,
      designationId: e.designationId,
      locationId: e.locationId,
      managerId: e.managerId,
    };
  }
}
