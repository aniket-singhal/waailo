import { Injectable } from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface EmployeeFilter {
  status?: Prisma.EnumEmployeeStatusFilter | Employee['status'];
  departmentId?: string;
  search?: string;
  managerId?: string;
}

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.EmployeeCreateInput): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  findById(companyId: string, id: string): Promise<Employee | null> {
    return this.prisma.employee.findFirst({ where: { id, companyId, deletedAt: null } });
  }

  findByUserId(companyId: string, userId: string): Promise<Employee | null> {
    return this.prisma.employee.findFirst({ where: { userId, companyId, deletedAt: null } });
  }

  countForCompany(companyId: string): Promise<number> {
    return this.prisma.employee.count({ where: { companyId } });
  }

  listActive(companyId: string): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE', deletedAt: null },
      orderBy: { employeeCode: 'asc' },
    });
  }

  update(id: string, data: Prisma.EmployeeUpdateInput): Promise<Employee> {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async search(
    companyId: string,
    filter: EmployeeFilter,
    skip: number,
    take: number,
  ): Promise<{ rows: Employee[]; total: number }> {
    const where: Prisma.EmployeeWhereInput = {
      companyId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status as Employee['status'] } : {}),
      ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter.managerId ? { managerId: filter.managerId } : {}),
      ...(filter.search
        ? {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
              { employeeCode: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.employee.count({ where }),
    ]);
    return { rows, total };
  }
}
