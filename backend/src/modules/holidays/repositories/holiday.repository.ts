import { Injectable } from '@nestjs/common';
import { Holiday, HolidayCalendar } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class HolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCalendar(data: {
    companyId: string;
    locationId?: string | null;
    year: number;
    name: string;
  }): Promise<HolidayCalendar> {
    return this.prisma.holidayCalendar.create({ data });
  }

  findCalendar(
    companyId: string,
    locationId: string | null,
    year: number,
  ): Promise<HolidayCalendar | null> {
    return this.prisma.holidayCalendar.findFirst({ where: { companyId, locationId, year } });
  }

  findCalendarById(companyId: string, id: string): Promise<HolidayCalendar | null> {
    return this.prisma.holidayCalendar.findFirst({ where: { id, companyId } });
  }

  listCalendars(companyId: string, year?: number): Promise<HolidayCalendar[]> {
    return this.prisma.holidayCalendar.findMany({
      where: { companyId, ...(year ? { year } : {}) },
      orderBy: { year: 'desc' },
    });
  }

  addHoliday(data: {
    calendarId: string;
    date: Date;
    name: string;
    isOptional?: boolean;
  }): Promise<Holiday> {
    return this.prisma.holiday.create({ data });
  }

  listHolidays(calendarId: string): Promise<Holiday[]> {
    return this.prisma.holiday.findMany({ where: { calendarId }, orderBy: { date: 'asc' } });
  }
}
