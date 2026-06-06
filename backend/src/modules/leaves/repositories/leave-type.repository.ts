import { Injectable } from '@nestjs/common';
import { LeavePolicy, LeaveType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class LeaveTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string): Promise<LeaveType[]> {
    return this.prisma.leaveType.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  findById(companyId: string, id: string): Promise<LeaveType | null> {
    return this.prisma.leaveType.findFirst({ where: { id, companyId } });
  }

  create(data: { companyId: string; code: string; name: string; isPaid: boolean; color?: string }) {
    return this.prisma.leaveType.create({ data });
  }

  createPolicy(data: {
    companyId: string;
    leaveTypeId: string;
    annualQuota: number;
    maxCarryForward: number;
    minPerRequest: number;
    maxPerRequest?: number | null;
    effectiveFrom: Date;
  }): Promise<LeavePolicy> {
    return this.prisma.leavePolicy.create({ data });
  }

  activePolicy(companyId: string, leaveTypeId: string): Promise<LeavePolicy | null> {
    return this.prisma.leavePolicy.findFirst({
      where: { companyId, leaveTypeId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
