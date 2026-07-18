import { Injectable } from '@nestjs/common';
import { ExitRecord } from '@prisma/client';
import { NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { OffboardingRepository } from './offboarding.repository';
import { InitiateExitDto, ToggleTaskDto, UpdateExitStatusDto } from './dto/offboarding.dto';

// Default clearance checklist created with every exit.
const DEFAULT_TASKS = [
  'Return company assets (laptop, ID card, access cards)',
  'Knowledge transfer / handover',
  'Revoke system & email access',
  'Final settlement (F&F) processed',
  'Conduct exit interview',
  'Issue relieving & experience letter',
];

@Injectable()
export class OffboardingService {
  constructor(
    private readonly repo: OffboardingRepository,
    private readonly employees: EmployeeRepository,
  ) {}

  async initiate(user: AuthUser, dto: InitiateExitDto) {
    const employee = await this.employees.findById(user.companyId, dto.employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (employee.status === 'EXITED') {
      throw new UnprocessableError('Employee has already exited', 'ALREADY_EXITED');
    }

    const exit = await this.repo.createExit({
      companyId: user.companyId,
      employeeId: dto.employeeId,
      type: dto.type,
      reason: dto.reason,
      noticeDate: new Date(dto.noticeDate),
      lastWorkingDay: new Date(dto.lastWorkingDay),
      status: 'INITIATED',
    });

    await this.repo.createTasks(
      DEFAULT_TASKS.map((label) => ({
        companyId: user.companyId,
        exitRecordId: exit.id,
        label,
      })),
    );

    // Move the employee to ON_NOTICE while offboarding is in progress.
    await this.employees.update(employee.id, { status: 'ON_NOTICE' });
    return this.enrich(user.companyId, exit);
  }

  async list(user: AuthUser) {
    const rows = await this.repo.listExits(user.companyId);
    const out = [];
    for (const r of rows) out.push(await this.enrich(user.companyId, r));
    return out;
  }

  async get(user: AuthUser, id: string) {
    const exit = await this.repo.findExit(user.companyId, id);
    if (!exit) throw new NotFoundError('Exit record not found');
    const tasks = await this.repo.listTasks(user.companyId, id);
    return { ...(await this.enrich(user.companyId, exit)), tasks };
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateExitStatusDto) {
    const exit = await this.repo.findExit(user.companyId, id);
    if (!exit) throw new NotFoundError('Exit record not found');

    const updated = await this.repo.updateExit(id, {
      status: dto.status,
      ...(dto.exitInterview !== undefined ? { exitInterview: dto.exitInterview } : {}),
      ...(dto.rehireEligible !== undefined ? { rehireEligible: dto.rehireEligible } : {}),
    });

    // On completion, mark the employee EXITED and record the exit date.
    if (dto.status === 'COMPLETED') {
      await this.employees.update(exit.employeeId, {
        status: 'EXITED',
        dateOfExit: exit.lastWorkingDay,
      });
    } else if (dto.status === 'CANCELLED') {
      // Reinstate the employee if the exit is cancelled.
      await this.employees.update(exit.employeeId, { status: 'ACTIVE' });
    }
    return this.enrich(user.companyId, updated);
  }

  async toggleTask(user: AuthUser, taskId: string, dto: ToggleTaskDto) {
    const task = await this.repo.findTask(user.companyId, taskId);
    if (!task) throw new NotFoundError('Task not found');
    return this.repo.updateTask(taskId, dto.done);
  }

  private async enrich(companyId: string, exit: ExitRecord) {
    const e = await this.employees.findById(companyId, exit.employeeId);
    return {
      ...exit,
      employeeName: e ? `${e.firstName} ${e.lastName}` : '—',
      employeeCode: e?.employeeCode ?? '',
    };
  }
}
