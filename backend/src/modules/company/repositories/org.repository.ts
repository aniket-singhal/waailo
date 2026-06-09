import { Injectable } from '@nestjs/common';
import { Department, Designation, Location } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

/** Tenant reference entities: departments, designations, locations. */
@Injectable()
export class OrgRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Departments
  listDepartments(companyId: string): Promise<Department[]> {
    return this.prisma.department.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  createDepartment(companyId: string, name: string): Promise<Department> {
    return this.prisma.department.create({ data: { companyId, name } });
  }

  // Designations
  listDesignations(companyId: string): Promise<Designation[]> {
    return this.prisma.designation.findMany({ where: { companyId }, orderBy: { title: 'asc' } });
  }

  createDesignation(companyId: string, title: string): Promise<Designation> {
    return this.prisma.designation.create({ data: { companyId, title } });
  }

  // Locations
  listLocations(companyId: string): Promise<Location[]> {
    return this.prisma.location.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  createLocation(companyId: string, name: string, timezone?: string): Promise<Location> {
    return this.prisma.location.create({
      data: { companyId, name, timezone: timezone ?? 'Asia/Kolkata' },
    });
  }

  findLocation(companyId: string, id: string): Promise<Location | null> {
    return this.prisma.location.findFirst({ where: { id, companyId } });
  }

  updateGeofence(
    id: string,
    geo: { geoLat: number | null; geoLng: number | null; geoRadiusM: number | null },
  ): Promise<Location> {
    return this.prisma.location.update({ where: { id }, data: geo });
  }
}
