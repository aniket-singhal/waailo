import { Injectable } from '@nestjs/common';
import { Payslip, PayslipLine } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PayslipLineDraft } from '../payroll.calculator';

export type PayslipWithLines = Payslip & { lines: PayslipLine[] };

@Injectable()
export class PayslipRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Deletes any existing payslip for (run, employee) then recreates — idempotent re-process. */
  async upsertWithLines(input: {
    companyId: string;
    payrollRunId: string;
    employeeId: string;
    gross: number;
    totalDeductions: number;
    net: number;
    lines: PayslipLineDraft[];
  }): Promise<Payslip> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payslip.findUnique({
        where: { payrollRunId_employeeId: { payrollRunId: input.payrollRunId, employeeId: input.employeeId } },
      });
      if (existing) {
        await tx.payslipLine.deleteMany({ where: { payslipId: existing.id } });
        await tx.payslip.delete({ where: { id: existing.id } });
      }
      return tx.payslip.create({
        data: {
          companyId: input.companyId,
          payrollRunId: input.payrollRunId,
          employeeId: input.employeeId,
          gross: input.gross,
          totalDeductions: input.totalDeductions,
          net: input.net,
          lines: {
            create: input.lines.map((l) => ({
              type: l.type,
              code: l.code,
              label: l.label,
              amount: l.amount,
              isStatutory: l.isStatutory,
            })),
          },
        },
      });
    });
  }

  listByRun(companyId: string, runId: string): Promise<PayslipWithLines[]> {
    return this.prisma.payslip.findMany({
      where: { companyId, payrollRunId: runId },
      include: { lines: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(companyId: string, id: string): Promise<PayslipWithLines | null> {
    return this.prisma.payslip.findFirst({ where: { id, companyId }, include: { lines: true } });
  }

  listForEmployee(companyId: string, employeeId: string): Promise<PayslipWithLines[]> {
    return this.prisma.payslip.findMany({
      where: { companyId, employeeId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
