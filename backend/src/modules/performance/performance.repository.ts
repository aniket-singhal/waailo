import { Injectable } from '@nestjs/common';
import { Goal, GoalStatus, Prisma, Review, ReviewCycle, ReviewCycleStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PerformanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Goals ----
  createGoal(data: Prisma.GoalUncheckedCreateInput): Promise<Goal> {
    return this.prisma.goal.create({ data });
  }
  listGoals(companyId: string, employeeId?: string): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  findGoal(companyId: string, id: string): Promise<Goal | null> {
    return this.prisma.goal.findFirst({ where: { id, companyId } });
  }
  updateGoal(id: string, data: { progress?: number; status?: GoalStatus }): Promise<Goal> {
    return this.prisma.goal.update({ where: { id }, data });
  }

  // ---- Review cycles ----
  createCycle(data: Prisma.ReviewCycleUncheckedCreateInput): Promise<ReviewCycle> {
    return this.prisma.reviewCycle.create({ data });
  }
  listCycles(companyId: string): Promise<ReviewCycle[]> {
    return this.prisma.reviewCycle.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }
  findCycle(companyId: string, id: string): Promise<ReviewCycle | null> {
    return this.prisma.reviewCycle.findFirst({ where: { id, companyId } });
  }
  updateCycle(id: string, data: { status?: ReviewCycleStatus }): Promise<ReviewCycle> {
    return this.prisma.reviewCycle.update({ where: { id }, data });
  }

  // ---- Reviews ----
  createReview(data: Prisma.ReviewUncheckedCreateInput): Promise<Review> {
    return this.prisma.review.create({ data });
  }
  findReview(companyId: string, id: string): Promise<Review | null> {
    return this.prisma.review.findFirst({ where: { id, companyId } });
  }
  listReviews(
    companyId: string,
    filter: { employeeId?: string; cycleId?: string },
  ): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: {
        companyId,
        ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter.cycleId ? { cycleId: filter.cycleId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  updateReview(
    id: string,
    data: {
      rating?: number;
      strengths?: string;
      improvements?: string;
      comments?: string;
      status?: Review['status'];
    },
  ): Promise<Review> {
    return this.prisma.review.update({ where: { id }, data });
  }
}
