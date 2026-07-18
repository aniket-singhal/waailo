import { ReportsService } from 'src/modules/reports/reports.service';
import { AuthUser } from 'src/common/tenant/auth-user';

const user: AuthUser = {
  userId: 'u1',
  companyId: 'c1',
  email: 'hr@demo.co',
  roles: ['HR_ADMIN'],
} as AuthUser;

describe('ReportsService.overview', () => {
  function buildPrisma() {
    return {
      employee: {
        count: jest
          .fn()
          // order of Promise.all: active, onNotice, exitedThisYear, newJoiners
          .mockResolvedValueOnce(10) // activeHeadcount
          .mockResolvedValueOnce(1) // onNotice
          .mockResolvedValueOnce(2) // exitedThisYear
          .mockResolvedValueOnce(3), // newJoinersThisYear
        groupBy: jest
          .fn()
          // first groupBy = by employmentType, second = by departmentId
          .mockResolvedValueOnce([{ employmentType: 'FULL_TIME', _count: { _all: 9 } }])
          .mockResolvedValueOnce([
            { departmentId: 'd1', _count: { _all: 6 } },
            { departmentId: null, _count: { _all: 4 } },
          ]),
      },
      department: { findMany: jest.fn().mockResolvedValue([{ id: 'd1', name: 'Engineering' }]) },
      leaveRequest: { count: jest.fn().mockResolvedValue(5) },
      jobOpening: { count: jest.fn().mockResolvedValue(2) },
      candidate: {
        groupBy: jest.fn().mockResolvedValue([{ stage: 'APPLIED', _count: { _all: 7 } }]),
      },
      payrollRun: {
        findFirst: jest.fn().mockResolvedValue({
          periodMonth: 5,
          periodYear: 2026,
          status: 'PAID',
          totalGross: 10000000,
          totalNet: 9800000,
        }),
      },
    };
  }

  it('aggregates headline metrics and maps department names', async () => {
    const prisma = buildPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new ReportsService(prisma as any);

    const r = await svc.overview(user);

    expect(r.headline.activeHeadcount).toBe(10);
    expect(r.headline.onNotice).toBe(1);
    expect(r.headline.exitedThisYear).toBe(2);
    expect(r.headline.newJoinersThisYear).toBe(3);
    expect(r.headline.pendingLeaves).toBe(5);
    expect(r.headline.openJobs).toBe(2);
    // attrition = 2/10 = 20%
    expect(r.headline.attritionRate).toBe(20);

    expect(r.headcountByDepartment).toEqual([
      { label: 'Engineering', count: 6 },
      { label: 'Unassigned', count: 4 },
    ]);
    expect(r.headcountByType).toEqual([{ label: 'FULL_TIME', count: 9 }]);
    expect(r.candidatesByStage).toEqual([{ label: 'APPLIED', count: 7 }]);
    expect(r.latestPayroll).toMatchObject({ totalNet: 9800000, periodMonth: 5 });
  });

  it('returns 0 attrition when there is no headcount', async () => {
    const prisma = buildPrisma();
    prisma.employee.count = jest
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new ReportsService(prisma as any);
    const r = await svc.overview(user);
    expect(r.headline.attritionRate).toBe(0);
  });
});
