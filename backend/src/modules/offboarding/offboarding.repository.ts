import { Injectable } from '@nestjs/common';
import { ExitRecord, ExitStatus, ExitTask, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class OffboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  createExit(data: Prisma.ExitRecordUncheckedCreateInput): Promise<ExitRecord> {
    return this.prisma.exitRecord.create({ data });
  }

  listExits(companyId: string): Promise<ExitRecord[]> {
    return this.prisma.exitRecord.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findExit(companyId: string, id: string): Promise<ExitRecord | null> {
    return this.prisma.exitRecord.findFirst({ where: { id, companyId } });
  }

  updateExit(
    id: string,
    data: { status?: ExitStatus; exitInterview?: string; rehireEligible?: boolean },
  ): Promise<ExitRecord> {
    return this.prisma.exitRecord.update({ where: { id }, data });
  }

  createTasks(data: Prisma.ExitTaskUncheckedCreateInput[]): Promise<{ count: number }> {
    return this.prisma.exitTask.createMany({ data });
  }

  listTasks(companyId: string, exitRecordId: string): Promise<ExitTask[]> {
    return this.prisma.exitTask.findMany({
      where: { companyId, exitRecordId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findTask(companyId: string, id: string): Promise<ExitTask | null> {
    return this.prisma.exitTask.findFirst({ where: { id, companyId } });
  }

  updateTask(id: string, done: boolean): Promise<ExitTask> {
    return this.prisma.exitTask.update({ where: { id }, data: { done } });
  }
}
