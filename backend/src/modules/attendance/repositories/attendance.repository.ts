import { Injectable } from '@nestjs/common';
import { AttendanceRecord, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByDate(employeeId: string, date: Date): Promise<AttendanceRecord | null> {
    return this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });
  }

  findById(companyId: string, id: string): Promise<AttendanceRecord | null> {
    return this.prisma.attendanceRecord.findFirst({ where: { id, companyId } });
  }

  upsert(
    companyId: string,
    employeeId: string,
    date: Date,
    create: Prisma.AttendanceRecordCreateInput,
    update: Prisma.AttendanceRecordUpdateInput,
  ): Promise<AttendanceRecord> {
    return this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date } },
      create,
      update,
    });
  }

  update(id: string, data: Prisma.AttendanceRecordUpdateInput): Promise<AttendanceRecord> {
    return this.prisma.attendanceRecord.update({ where: { id }, data });
  }

  findLocationGeofence(
    companyId: string,
    locationId: string,
  ): Promise<{ geoLat: number | null; geoLng: number | null; geoRadiusM: number | null } | null> {
    return this.prisma.location.findFirst({
      where: { id: locationId, companyId },
      select: { geoLat: true, geoLng: true, geoRadiusM: true },
    });
  }

  rangeForEmployee(
    companyId: string,
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<AttendanceRecord[]> {
    return this.prisma.attendanceRecord.findMany({
      where: { companyId, employeeId, date: { gte: from, lte: to } },
      orderBy: { date: 'desc' },
    });
  }
}
