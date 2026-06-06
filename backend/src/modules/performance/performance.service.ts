import { Injectable } from '@nestjs/common';
import { Goal, Review, RoleName } from '@prisma/client';
import { ForbiddenError, NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { PerformanceRepository } from './performance.repository';
import {
  CreateCycleDto,
  CreateGoalDto,
  CreateReviewDto,
  CycleStatusDto,
  SubmitReviewDto,
  UpdateGoalDto,
} from './dto/performance.dto';

@Injectable()
export class PerformanceService {
  constructor(
    private readonly repo: PerformanceRepository,
    private readonly employees: EmployeeRepository,
  ) {}

  // ---- Goals ----
  async createGoal(user: AuthUser, dto: CreateGoalDto): Promise<Goal> {
    const employeeId =
      dto.employeeId && this.hasHrAccess(user) ? dto.employeeId : await this.selfEmployeeId(user);
    return this.repo.createGoal({
      companyId: user.companyId,
      employeeId,
      title: dto.title,
      description: dto.description,
      metric: dto.metric,
      target: dto.target,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: 'ACTIVE',
    });
  }

  async listGoals(user: AuthUser, employeeIdParam?: string) {
    let employeeId: string | undefined;
    if (this.hasHrAccess(user)) {
      employeeId = employeeIdParam;
    } else {
      employeeId = await this.selfEmployeeId(user);
    }
    const goals = await this.repo.listGoals(user.companyId, employeeId);
    return this.enrich(user.companyId, goals);
  }

  async updateGoal(user: AuthUser, id: string, dto: UpdateGoalDto) {
    const goal = await this.repo.findGoal(user.companyId, id);
    if (!goal) throw new NotFoundError('Goal not found');
    await this.assertOwnsOrHr(user, goal.employeeId);
    return this.repo.updateGoal(id, {
      ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });
  }

  // ---- Review cycles ----
  createCycle(user: AuthUser, dto: CreateCycleDto) {
    return this.repo.createCycle({
      companyId: user.companyId,
      name: dto.name,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      status: 'DRAFT',
    });
  }

  listCycles(user: AuthUser) {
    return this.repo.listCycles(user.companyId);
  }

  async setCycleStatus(user: AuthUser, id: string, dto: CycleStatusDto) {
    const cycle = await this.repo.findCycle(user.companyId, id);
    if (!cycle) throw new NotFoundError('Review cycle not found');
    return this.repo.updateCycle(id, { status: dto.status });
  }

  // ---- Reviews ----
  async createReview(user: AuthUser, dto: CreateReviewDto) {
    const cycle = await this.repo.findCycle(user.companyId, dto.cycleId);
    if (!cycle) throw new NotFoundError('Review cycle not found');
    try {
      return await this.repo.createReview({
        companyId: user.companyId,
        cycleId: dto.cycleId,
        employeeId: dto.employeeId,
        reviewerId: user.userId,
        status: 'PENDING',
      });
    } catch (e) {
      if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
        throw new UnprocessableError('A review already exists for this employee in the cycle', 'REVIEW_EXISTS');
      }
      throw e;
    }
  }

  async submitReview(user: AuthUser, id: string, dto: SubmitReviewDto) {
    const review = await this.repo.findReview(user.companyId, id);
    if (!review) throw new NotFoundError('Review not found');
    if (!this.hasHrAccess(user) && review.reviewerId !== user.userId) {
      throw new ForbiddenError('Only the assigned reviewer or HR can submit this review');
    }
    return this.repo.updateReview(id, {
      rating: dto.rating,
      strengths: dto.strengths,
      improvements: dto.improvements,
      comments: dto.comments,
      status: 'SUBMITTED',
    });
  }

  async listReviews(user: AuthUser, cycleId?: string) {
    if (this.hasHrAccess(user)) {
      const rows = await this.repo.listReviews(user.companyId, { cycleId });
      return this.enrichReviews(user.companyId, rows);
    }
    const self = await this.selfEmployeeId(user);
    const rows = await this.repo.listReviews(user.companyId, { employeeId: self, cycleId });
    return this.enrichReviews(user.companyId, rows);
  }

  // ---- helpers ----
  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private async selfEmployeeId(user: AuthUser): Promise<string> {
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (!self) {
      throw new UnprocessableError('Your user is not linked to an employee record', 'NO_EMPLOYEE');
    }
    return self.id;
  }

  private async assertOwnsOrHr(user: AuthUser, employeeId: string): Promise<void> {
    if (this.hasHrAccess(user)) return;
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (self?.id !== employeeId) {
      throw new ForbiddenError('Not allowed to modify this goal');
    }
  }

  private async enrich(companyId: string, goals: Goal[]) {
    const out = [];
    for (const g of goals) {
      const e = await this.employees.findById(companyId, g.employeeId);
      out.push({ ...g, employeeName: e ? `${e.firstName} ${e.lastName}` : '—' });
    }
    return out;
  }

  private async enrichReviews(companyId: string, reviews: Review[]) {
    const out = [];
    for (const r of reviews) {
      const e = await this.employees.findById(companyId, r.employeeId);
      out.push({ ...r, employeeName: e ? `${e.firstName} ${e.lastName}` : '—' });
    }
    return out;
  }
}
