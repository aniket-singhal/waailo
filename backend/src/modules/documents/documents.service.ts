import { Inject, Injectable } from '@nestjs/common';
import { Document, RoleName } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { Paginated, paginate } from 'src/common/dto/pagination.dto';
import { ForbiddenError, NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { DocumentRepository } from './repositories/document.repository';
import { STORAGE_PORT, StoragePort } from './storage/storage.port';
import {
  ConfirmUploadDto,
  DocumentQueryDto,
  DocumentResponseDto,
  PresignedUploadDto,
  UploadIntentDto,
} from './dto/document.dto';

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly employees: EmployeeRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async createUploadIntent(
    companyId: string,
    dto: UploadIntentDto,
  ): Promise<PresignedUploadDto> {
    if (dto.sizeBytes > MAX_SIZE_BYTES) {
      throw new UnprocessableError('File exceeds the 25MB limit', 'FILE_TOO_LARGE');
    }
    const objectKey = `companies/${companyId}/documents/${uuid()}`;
    const uploadUrl = await this.storage.presignPut(objectKey, dto.mimeType);
    return { uploadUrl, objectKey };
  }

  async confirmUpload(
    companyId: string,
    dto: ConfirmUploadDto,
  ): Promise<DocumentResponseDto> {
    if (!dto.objectKey.startsWith(`companies/${companyId}/`)) {
      throw new ForbiddenError('Object key does not belong to this company');
    }
    const exists = await this.storage.exists(dto.objectKey);
    if (!exists) {
      throw new UnprocessableError('Uploaded object not found', 'UPLOAD_NOT_FOUND');
    }
    const doc = await this.documents.create({
      company: { connect: { id: companyId } },
      title: dto.title,
      objectKey: dto.objectKey,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      category: dto.category ?? 'OTHER',
      accessLevel: dto.accessLevel ?? 'COMPANY_ADMIN',
      ...(dto.ownerEmployeeId ? { employee: { connect: { id: dto.ownerEmployeeId } } } : {}),
      ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
    });
    return this.toDto(doc);
  }

  async list(user: AuthUser, query: DocumentQueryDto): Promise<Paginated<DocumentResponseDto>> {
    const filter: { category?: Document['category']; ownerEmployeeId?: string } = {
      category: query.category,
    };
    // Non-HR users can only list their own documents.
    if (!this.hasHrAccess(user)) {
      const self = await this.employees.findByUserId(user.companyId, user.userId);
      filter.ownerEmployeeId = self?.id ?? '__none__';
    } else if (query.ownerEmployeeId) {
      filter.ownerEmployeeId = query.ownerEmployeeId;
    }
    const { rows, total } = await this.documents.list(
      user.companyId,
      filter,
      query.skip,
      query.take,
    );
    return paginate(rows.map((d) => this.toDto(d)), total, query.page, query.pageSize);
  }

  async getDownloadUrl(user: AuthUser, id: string): Promise<{ url: string }> {
    const doc = await this.documents.findById(user.companyId, id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    await this.assertCanAccess(user, doc);
    const url = await this.storage.presignGet(doc.objectKey);
    return { url };
  }

  async softDelete(user: AuthUser, id: string): Promise<void> {
    const doc = await this.documents.findById(user.companyId, id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    const owns = await this.isOwner(user, doc);
    if (!this.hasHrAccess(user) && !owns) {
      throw new ForbiddenError('Not allowed to delete this document');
    }
    await this.documents.softDelete(doc.id);
  }

  // ---- access control ----
  private async assertCanAccess(user: AuthUser, doc: Document): Promise<void> {
    if (this.hasHrAccess(user)) {
      return;
    }
    if (await this.isOwner(user, doc)) {
      return;
    }
    if (doc.accessLevel === 'MANAGER_AND_OWNER' && (await this.isManagerOfOwner(user, doc))) {
      return;
    }
    throw new ForbiddenError('Not allowed to access this document');
  }

  private async isOwner(user: AuthUser, doc: Document): Promise<boolean> {
    if (!doc.ownerEmployeeId) {
      return false;
    }
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    return self?.id === doc.ownerEmployeeId;
  }

  private async isManagerOfOwner(user: AuthUser, doc: Document): Promise<boolean> {
    if (!doc.ownerEmployeeId || !user.roles.includes(RoleName.MANAGER)) {
      return false;
    }
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    const owner = await this.employees.findById(user.companyId, doc.ownerEmployeeId);
    return !!self && !!owner && owner.managerId === self.id;
  }

  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private toDto(d: Document): DocumentResponseDto {
    return {
      id: d.id,
      title: d.title,
      category: d.category,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      accessLevel: d.accessLevel,
      ownerEmployeeId: d.ownerEmployeeId,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    };
  }
}
