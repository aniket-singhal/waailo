import { Injectable } from '@nestjs/common';
import { PayrollRun, PayrollStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PayrollRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPeriod(companyId: string, year: number, month: number): Promise<PayrollRun | null> {
    return this.prisma.payrollRun.findUnique({
      where: { companyId_periodYear_periodMonth: { companyId, periodYear: year, periodMonth: month } },
    });
  }

  findById(companyId: string, id: string): Promise<PayrollRun | null> {
    return this.prisma.payrollRun.findFirst({ where: { id, companyId } });
  }

  create(companyId: string, month: number, year: number): Promise<PayrollRun> {
    return this.prisma.payrollRun.create({
      data: { companyId, periodMonth: month, periodYear: year, status: PayrollStatus.DRAFT },
    });
  }

  list(companyId: string): Promise<PayrollRun[]> {
    return this.prisma.payrollRun.findMany({
      where: { companyId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  update(
    id: string,
    data: { status?: PayrollStatus; totalGross?: number; totalNet?: number; processedAt?: Date },
  ): Promise<PayrollRun> {
    return this.prisma.payrollRun.update({ where: { id }, data });
  }
}
