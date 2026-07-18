import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { Employee } from '@prisma/client';
import { AppConfigService } from 'src/common/config/app-config.service';
import { ForbiddenError, NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { RoleName } from '@prisma/client';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { OnboardingRepository } from './onboarding.repository';
import { ReviewOnboardingDto, SaveOnboardingDto } from './dto/onboarding.dto';

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly repo: OnboardingRepository,
    private readonly employees: EmployeeRepository,
    private readonly config: AppConfigService,
  ) {}

  // ---------- Employee self-service ----------
  async getMine(user: AuthUser) {
    const self = await this.selfEmployee(user);
    return this.assemble(user.companyId, self);
  }

  async saveMine(user: AuthUser, dto: SaveOnboardingDto) {
    const self = await this.selfEmployee(user);
    const cid = user.companyId;

    await this.employees.update(self.id, {
      ...this.employeeScalars(dto),
      onboardingStatus: 'IN_PROGRESS',
    });

    if (dto.education) {
      await this.repo.replaceEducation(
        cid,
        self.id,
        dto.education.map((e) => ({ companyId: cid, employeeId: self.id, ...e })),
      );
    }
    if (dto.previousEmployment) {
      await this.repo.replacePreviousEmployment(
        cid,
        self.id,
        dto.previousEmployment.map((p) => ({
          companyId: cid,
          employeeId: self.id,
          organization: p.organization,
          designation: p.designation,
          fromDate: p.fromDate ? new Date(p.fromDate) : null,
          toDate: p.toDate ? new Date(p.toDate) : null,
          lastCtc: p.lastCtc,
          reasonForLeaving: p.reasonForLeaving,
          managerName: p.managerName,
          managerContact: p.managerContact,
        })),
      );
    }
    if (dto.emergencyContacts) {
      await this.repo.replaceEmergencyContacts(
        cid,
        self.id,
        dto.emergencyContacts.map((c) => ({ companyId: cid, employeeId: self.id, ...c })),
      );
    }
    if (dto.nominees) {
      await this.repo.replaceNominees(
        cid,
        self.id,
        dto.nominees.map((n) => ({
          companyId: cid,
          employeeId: self.id,
          name: n.name,
          relationship: n.relationship,
          dateOfBirth: n.dateOfBirth ? new Date(n.dateOfBirth) : null,
          contactNumber: n.contactNumber,
          sharePercent: n.sharePercent,
          address: n.address,
        })),
      );
    }

    const updated = await this.employees.findById(cid, self.id);
    return this.assemble(cid, updated as Employee);
  }

  async submitMine(user: AuthUser) {
    const self = await this.selfEmployee(user);
    if (self.onboardingStatus === 'APPROVED') {
      throw new UnprocessableError('Onboarding already approved', 'ALREADY_APPROVED');
    }
    await this.employees.update(self.id, { onboardingStatus: 'SUBMITTED' });
    const updated = await this.employees.findById(user.companyId, self.id);
    return this.assemble(user.companyId, updated as Employee);
  }

  async uploadMine(user: AuthUser, file: UploadedFileLike | undefined, docType: string) {
    if (!file) throw new UnprocessableError('No file uploaded', 'NO_FILE');
    if (file.size > MAX_SIZE) throw new UnprocessableError('File exceeds the 25MB limit', 'FILE_TOO_LARGE');
    const self = await this.selfEmployee(user);
    const { objectKey } = await this.writeFile(user.companyId, file);
    const doc = await this.repo.createDocument({
      companyId: user.companyId,
      ownerEmployeeId: self.id,
      title: docType,
      objectKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      category: this.categoryFor(docType),
      accessLevel: 'COMPANY_ADMIN',
    });
    return this.toDocDto(doc);
  }

  async downloadDoc(user: AuthUser, id: string) {
    const doc = await this.repo.findDocument(user.companyId, id);
    if (!doc) throw new NotFoundError('Document not found');
    if (!this.hasHrAccess(user)) {
      const self = await this.employees.findByUserId(user.companyId, user.userId);
      if (!self || doc.ownerEmployeeId !== self.id) {
        throw new ForbiddenError('Not allowed to access this document');
      }
    }
    const buffer = await fs.readFile(join(this.config.storage.localDir, doc.objectKey));
    return { buffer, mimeType: doc.mimeType, filename: doc.title };
  }

  // ---------- HR review ----------
  async list(user: AuthUser) {
    const rows = await this.repo.listOnboardingEmployees(user.companyId);
    return rows.map((e: Employee) => ({
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      employeeCode: e.employeeCode,
      onboardingStatus: e.onboardingStatus,
      updatedAt: e.updatedAt,
    }));
  }

  async getFor(user: AuthUser, employeeId: string) {
    const emp = await this.employees.findById(user.companyId, employeeId);
    if (!emp) throw new NotFoundError('Employee not found');
    return this.assemble(user.companyId, emp);
  }

  async review(user: AuthUser, employeeId: string, dto: ReviewOnboardingDto) {
    const emp = await this.employees.findById(user.companyId, employeeId);
    if (!emp) throw new NotFoundError('Employee not found');
    await this.employees.update(employeeId, {
      onboardingStatus: dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    });
    const updated = await this.employees.findById(user.companyId, employeeId);
    return this.assemble(user.companyId, updated as Employee);
  }

  // ---------- helpers ----------
  private async selfEmployee(user: AuthUser): Promise<Employee> {
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (!self) throw new UnprocessableError('Your user is not linked to an employee record', 'NO_EMPLOYEE');
    return self;
  }

  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private async assemble(companyId: string, emp: Employee) {
    const [education, previousEmployment, emergencyContacts, nominees, documents] = await Promise.all([
      this.repo.listEducation(companyId, emp.id),
      this.repo.listPreviousEmployment(companyId, emp.id),
      this.repo.listEmergencyContacts(companyId, emp.id),
      this.repo.listNominees(companyId, emp.id),
      this.repo.listDocuments(companyId, emp.id),
    ]);
    return {
      employee: emp,
      onboardingStatus: emp.onboardingStatus,
      education,
      previousEmployment,
      emergencyContacts,
      nominees,
      documents: documents.map((d) => this.toDocDto(d)),
    };
  }

  private employeeScalars(dto: SaveOnboardingDto): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const strFields: (keyof SaveOnboardingDto)[] = [
      'gender', 'maritalStatus', 'nationality', 'bloodGroup', 'personalEmail', 'alternatePhone',
      'currentAddress', 'permanentAddress', 'aadhaarRef', 'panRef', 'uan', 'esiNumber',
      'passportNumber', 'drivingLicense', 'bankAccountHolder', 'bankName', 'bankAccount',
      'bankIfsc', 'bankBranch',
    ];
    for (const f of strFields) {
      const v = dto[f];
      if (v !== undefined && v !== '') out[f] = v;
    }
    if (dto.prevPfMember !== undefined) out.prevPfMember = dto.prevPfMember;
    if (dto.dateOfBirth) out.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.passportExpiry) out.passportExpiry = new Date(dto.passportExpiry);
    if (dto.drivingLicenseExpiry) out.drivingLicenseExpiry = new Date(dto.drivingLicenseExpiry);
    return out;
  }

  private async writeFile(companyId: string, file: UploadedFileLike): Promise<{ objectKey: string }> {
    const rel = join('companies', companyId, 'onboarding');
    const dir = join(this.config.storage.localDir, rel);
    await fs.mkdir(dir, { recursive: true });
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    const objectKey = join(rel, `${uuid()}-${safe}`);
    await fs.writeFile(join(this.config.storage.localDir, objectKey), file.buffer);
    return { objectKey };
  }

  private categoryFor(docType: string): 'ID_PROOF' | 'CERTIFICATE' | 'OTHER' {
    const t = docType.toLowerCase();
    if (/aadhaar|pan|passport|licen|cheque|bank/.test(t)) return 'ID_PROOF';
    if (/marksheet|degree|certificate|education|10th|12th|graduation/.test(t)) return 'CERTIFICATE';
    return 'OTHER';
  }

  private toDocDto(d: { id: string; title: string; mimeType: string; sizeBytes: number; category: string; createdAt: Date }) {
    return {
      id: d.id,
      title: d.title,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      category: d.category,
      createdAt: d.createdAt,
    };
  }
}
