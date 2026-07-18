import { Injectable } from '@nestjs/common';
import {
  Document,
  EmergencyContact,
  EmployeeEducation,
  Nominee,
  PreviousEmployment,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- child collections ----
  listEducation(companyId: string, employeeId: string): Promise<EmployeeEducation[]> {
    return this.prisma.employeeEducation.findMany({ where: { companyId, employeeId } });
  }
  listPreviousEmployment(companyId: string, employeeId: string): Promise<PreviousEmployment[]> {
    return this.prisma.previousEmployment.findMany({ where: { companyId, employeeId } });
  }
  listEmergencyContacts(companyId: string, employeeId: string): Promise<EmergencyContact[]> {
    return this.prisma.emergencyContact.findMany({ where: { companyId, employeeId } });
  }
  listNominees(companyId: string, employeeId: string): Promise<Nominee[]> {
    return this.prisma.nominee.findMany({ where: { companyId, employeeId } });
  }

  async replaceEducation(companyId: string, employeeId: string, rows: Prisma.EmployeeEducationUncheckedCreateInput[]) {
    await this.prisma.employeeEducation.deleteMany({ where: { companyId, employeeId } });
    if (rows.length) await this.prisma.employeeEducation.createMany({ data: rows });
  }
  async replacePreviousEmployment(companyId: string, employeeId: string, rows: Prisma.PreviousEmploymentUncheckedCreateInput[]) {
    await this.prisma.previousEmployment.deleteMany({ where: { companyId, employeeId } });
    if (rows.length) await this.prisma.previousEmployment.createMany({ data: rows });
  }
  async replaceEmergencyContacts(companyId: string, employeeId: string, rows: Prisma.EmergencyContactUncheckedCreateInput[]) {
    await this.prisma.emergencyContact.deleteMany({ where: { companyId, employeeId } });
    if (rows.length) await this.prisma.emergencyContact.createMany({ data: rows });
  }
  async replaceNominees(companyId: string, employeeId: string, rows: Prisma.NomineeUncheckedCreateInput[]) {
    await this.prisma.nominee.deleteMany({ where: { companyId, employeeId } });
    if (rows.length) await this.prisma.nominee.createMany({ data: rows });
  }

  // ---- documents ----
  createDocument(data: Prisma.DocumentUncheckedCreateInput): Promise<Document> {
    return this.prisma.document.create({ data });
  }
  listDocuments(companyId: string, employeeId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { companyId, ownerEmployeeId: employeeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
  findDocument(companyId: string, id: string): Promise<Document | null> {
    return this.prisma.document.findFirst({ where: { id, companyId, deletedAt: null } });
  }

  // ---- HR queries ----
  listOnboardingEmployees(companyId: string) {
    return this.prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        onboardingStatus: { in: ['IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'] },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
