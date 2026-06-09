import { Injectable } from '@nestjs/common';
import { Prisma, Shift, ShiftAssignment } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

export type AssignmentWithShift = ShiftAssignment & { shift: Shift };

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createShift(data: Prisma.ShiftUncheckedCreateInput): Promise<Shift> {
    return this.prisma.shift.create({ data });
  }

  listShifts(companyId: string): Promise<Shift[]> {
    return this.prisma.shift.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  findShift(companyId: string, id: string): Promise<Shift | null> {
    return this.prisma.shift.findFirst({ where: { id, companyId } });
  }

  createAssignment(data: Prisma.ShiftAssignmentUncheckedCreateInput): Promise<ShiftAssignment> {
    return this.prisma.shiftAssignment.create({ data });
  }

  listAssignments(companyId: string, employeeId?: string): Promise<AssignmentWithShift[]> {
    return this.prisma.shiftAssignment.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /** The assignment in effect for an employee on a given date. */
  currentAssignment(
    companyId: string,
    employeeId: string,
    onDate: Date,
  ): Promise<AssignmentWithShift | null> {
    return this.prisma.shiftAssignment.findFirst({
      where: {
        companyId,
        employeeId,
        effectiveFrom: { lte: onDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
