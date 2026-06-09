import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from 'src/common/errors/app-exception';
import { slugify } from 'src/common/utils/slug.util';
import { UsersService } from 'src/modules/auth/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { TokenPair } from 'src/modules/auth/token.service';
import { CompanyRepository } from './repositories/company.repository';
import { OrgRepository } from './repositories/org.repository';
import {
  CompanyResponseDto,
  DepartmentDto,
  DesignationDto,
  LocationDto,
  SetGeofenceDto,
  SignupDto,
  UpdateSettingsDto,
} from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly org: OrgRepository,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  /** Creates a tenant + its OWNER user, then returns an auto-login token pair. */
  async signup(dto: SignupDto): Promise<{ company: CompanyResponseDto; tokens: TokenPair }> {
    const slug = await this.uniqueSlug(dto.companyName);
    const company = await this.companies.create({
      name: dto.companyName,
      slug,
      status: 'ACTIVE',
    });
    const owner = await this.users.createOwner(company.id, dto.ownerEmail, dto.ownerPassword);
    const tokens = await this.auth.issueTokensForUserId(owner.id);
    return { company: this.toDto(company), tokens };
  }

  async getCompany(companyId: string): Promise<CompanyResponseDto> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    return this.toDto(company);
  }

  async updateSettings(companyId: string, dto: UpdateSettingsDto): Promise<CompanyResponseDto> {
    const company = await this.companies.update(companyId, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.settings ? { settings: dto.settings as Prisma.InputJsonValue } : {}),
    });
    return this.toDto(company);
  }

  // ---- Departments ----
  listDepartments(companyId: string) {
    return this.org.listDepartments(companyId);
  }

  async createDepartment(companyId: string, dto: DepartmentDto) {
    try {
      return await this.org.createDepartment(companyId, dto.name);
    } catch (e) {
      throw this.asConflict(e, 'A department with this name already exists', 'DEPARTMENT_EXISTS');
    }
  }

  // ---- Designations ----
  listDesignations(companyId: string) {
    return this.org.listDesignations(companyId);
  }

  async createDesignation(companyId: string, dto: DesignationDto) {
    try {
      return await this.org.createDesignation(companyId, dto.title);
    } catch (e) {
      throw this.asConflict(e, 'A designation with this title already exists', 'DESIGNATION_EXISTS');
    }
  }

  // ---- Locations ----
  listLocations(companyId: string) {
    return this.org.listLocations(companyId);
  }

  async createLocation(companyId: string, dto: LocationDto) {
    try {
      return await this.org.createLocation(companyId, dto.name, dto.timezone);
    } catch (e) {
      throw this.asConflict(e, 'A location with this name already exists', 'LOCATION_EXISTS');
    }
  }

  async setLocationGeofence(companyId: string, id: string, dto: SetGeofenceDto) {
    const loc = await this.org.findLocation(companyId, id);
    if (!loc) throw new NotFoundError('Location not found');
    return this.org.updateGeofence(id, {
      geoLat: dto.geoLat ?? null,
      geoLng: dto.geoLng ?? null,
      geoRadiusM: dto.geoRadiusM ?? null,
    });
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'company';
    let candidate = base;
    let n = 1;
    while (await this.companies.findBySlug(candidate)) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
  }

  private asConflict(e: unknown, message: string, code: string): Error {
    if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
      return new ConflictError(message, code);
    }
    return e as Error;
  }

  private toDto(company: Company): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      country: company.country,
      currency: company.currency,
      status: company.status,
      settings: company.settings as Record<string, unknown>,
    };
  }
}
