import { Injectable } from '@nestjs/common';
import { LeaveRequest, Prisma, RequestStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class LeaveRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.LeaveRequestCreateInput): Promise<LeaveRequest> {
    return this.prisma.leaveRequest.create({ data });
  }

  findById(companyId: string, id: string): Promise<LeaveRequest | null> {
    return this.prisma.leaveRequest.findFirst({ where: { id, companyId } });
  }

  update(id: string, data: Prisma.LeaveRequestUpdateInput): Promise<LeaveRequest> {
    return this.prisma.leaveRequest.update({ where: { id }, data });
  }

  /** Active (pending/approved) requests for an employee that could overlap. */
  activeForEmployee(companyId: string, employeeId: string): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: { companyId, employeeId, status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] } },
    });
  }

  list(
    companyId: string,
    filter: { employeeId?: string; status?: RequestStatus },
  ): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  listPending(companyId: string): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: { companyId, status: RequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  inRange(companyId: string, from: Date, to: Date): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: RequestStatus.APPROVED,
        startDate: { lte: to },
        endDate: { gte: from },
      },
    });
  }
}
