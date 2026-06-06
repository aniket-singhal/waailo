import { Injectable } from '@nestjs/common';
import { LeaveBalance } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class LeaveBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(employeeId: string, leaveTypeId: string, periodYear: number): Promise<LeaveBalance | null> {
    return this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_periodYear: { employeeId, leaveTypeId, periodYear } },
    });
  }

  listForEmployee(companyId: string, employeeId: string, periodYear: number): Promise<LeaveBalance[]> {
    return this.prisma.leaveBalance.findMany({
      where: { companyId, employeeId, periodYear },
    });
  }

  /** Ensures a balance row exists (seeded from the policy's annual quota). */
  upsertEntitlement(data: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    periodYear: number;
    entitled: number;
  }): Promise<LeaveBalance> {
    return this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_periodYear: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          periodYear: data.periodYear,
        },
      },
      update: {},
      create: {
        companyId: data.companyId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        periodYear: data.periodYear,
        entitled: data.entitled,
        accrued: data.entitled,
      },
    });
  }

  adjust(id: string, delta: { used?: number; pending?: number }): Promise<LeaveBalance> {
    return this.prisma.leaveBalance.update({
      where: { id },
      data: {
        ...(delta.used !== undefined ? { used: { increment: delta.used } } : {}),
        ...(delta.pending !== undefined ? { pending: { increment: delta.pending } } : {}),
      },
    });
  }
}
