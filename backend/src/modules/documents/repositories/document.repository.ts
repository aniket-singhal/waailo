import { Injectable } from '@nestjs/common';
import { Document, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DocumentCreateInput): Promise<Document> {
    return this.prisma.document.create({ data });
  }

  findById(companyId: string, id: string): Promise<Document | null> {
    return this.prisma.document.findFirst({ where: { id, companyId, deletedAt: null } });
  }

  async list(
    companyId: string,
    filter: { category?: Document['category']; ownerEmployeeId?: string },
    skip: number,
    take: number,
  ): Promise<{ rows: Document[]; total: number }> {
    const where: Prisma.DocumentWhereInput = {
      companyId,
      deletedAt: null,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.ownerEmployeeId ? { ownerEmployeeId: filter.ownerEmployeeId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.document.count({ where }),
    ]);
    return { rows, total };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
