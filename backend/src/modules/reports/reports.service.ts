import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/common/tenant/auth-user';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cross-module company overview for the HR analytics dashboard. */
  async overview(user: AuthUser) {
    const companyId = user.companyId;
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

    const [
      activeHeadcount,
      onNotice,
      exitedThisYear,
      newJoinersThisYear,
      byTypeRaw,
      byDeptRaw,
      departments,
      pendingLeaves,
      openJobs,
      candidatesByStageRaw,
      latestPayroll,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.employee.count({ where: { companyId, status: 'ON_NOTICE', deletedAt: null } }),
      this.prisma.employee.count({
        where: { companyId, status: 'EXITED', dateOfExit: { gte: yearStart } },
      }),
      this.prisma.employee.count({
        where: { companyId, dateOfJoining: { gte: yearStart }, deletedAt: null },
      }),
      this.prisma.employee.groupBy({
        by: ['employmentType'],
        where: { companyId, status: 'ACTIVE', deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.employee.groupBy({
        by: ['departmentId'],
        where: { companyId, status: 'ACTIVE', deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.department.findMany({ where: { companyId } }),
      this.prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.jobOpening.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.candidate.groupBy({
        by: ['stage'],
        where: { companyId },
        _count: { _all: true },
      }),
      this.prisma.payrollRun.findFirst({
        where: { companyId },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      }),
    ]);

    const deptName = new Map<string, string>(
      departments.map((d: { id: string; name: string }) => [d.id, d.name]),
    );

    const headcountByDepartment = byDeptRaw.map(
      (r: { departmentId: string | null; _count: { _all: number } }) => ({
        label: r.departmentId ? deptName.get(r.departmentId) ?? 'Unknown' : 'Unassigned',
        count: r._count._all,
      }),
    );

    const headcountByType = byTypeRaw.map(
      (r: { employmentType: string; _count: { _all: number } }) => ({
        label: r.employmentType,
        count: r._count._all,
      }),
    );

    const candidatesByStage = candidatesByStageRaw.map(
      (r: { stage: string; _count: { _all: number } }) => ({
        label: r.stage,
        count: r._count._all,
      }),
    );

    // Simple annualised attrition proxy: exits this year / active headcount.
    const attritionRate =
      activeHeadcount > 0 ? Math.round((exitedThisYear / activeHeadcount) * 1000) / 10 : 0;

    return {
      headline: {
        activeHeadcount,
        onNotice,
        newJoinersThisYear,
        exitedThisYear,
        attritionRate, // percent
        pendingLeaves,
        openJobs,
      },
      headcountByDepartment,
      headcountByType,
      candidatesByStage,
      latestPayroll: latestPayroll
        ? {
            periodMonth: latestPayroll.periodMonth,
            periodYear: latestPayroll.periodYear,
            status: latestPayroll.status,
            totalGross: latestPayroll.totalGross,
            totalNet: latestPayroll.totalNet,
          }
        : null,
    };
  }
}
