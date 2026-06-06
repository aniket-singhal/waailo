import { Injectable } from '@nestjs/common';
import { Prisma, RegularisationRequest } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RegularisationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RegularisationRequestCreateInput): Promise<RegularisationRequest> {
    return this.prisma.regularisationRequest.create({ data });
  }

  findById(companyId: string, id: string): Promise<RegularisationRequest | null> {
    return this.prisma.regularisationRequest.findFirst({ where: { id, companyId } });
  }

  update(id: string, data: Prisma.RegularisationRequestUpdateInput): Promise<RegularisationRequest> {
    return this.prisma.regularisationRequest.update({ where: { id }, data });
  }

  listPending(companyId: string): Promise<RegularisationRequest[]> {
    return this.prisma.regularisationRequest.findMany({
      where: { companyId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
