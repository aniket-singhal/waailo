import { Injectable } from '@nestjs/common';
import { Prisma, SalaryStructure } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class SalaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Deactivates any current active structure and creates a new active one atomically. */
  async setActive(
    companyId: string,
    employeeId: string,
    data: { ctcAnnual: number; components: Prisma.InputJsonValue; effectiveFrom: Date },
  ): Promise<SalaryStructure> {
    return this.prisma.$transaction(async (tx) => {
      await tx.salaryStructure.updateMany({
        where: { companyId, employeeId, isActive: true },
        data: { isActive: false },
      });
      return tx.salaryStructure.create({
        data: {
          companyId,
          employeeId,
          ctcAnnual: data.ctcAnnual,
          components: data.components,
          effectiveFrom: data.effectiveFrom,
          isActive: true,
        },
      });
    });
  }

  findActive(companyId: string, employeeId: string): Promise<SalaryStructure | null> {
    return this.prisma.salaryStructure.findFirst({
      where: { companyId, employeeId, isActive: true },
    });
  }
}
