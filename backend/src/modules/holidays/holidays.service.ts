import { Injectable } from '@nestjs/common';
import { Holiday } from '@prisma/client';
import { ConflictError, NotFoundError } from 'src/common/errors/app-exception';
import { HolidayRepository } from './repositories/holiday.repository';
import { AddHolidayDto, CreateCalendarDto } from './dto/holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private readonly holidays: HolidayRepository) {}

  async createCalendar(companyId: string, dto: CreateCalendarDto) {
    const existing = await this.holidays.findCalendar(companyId, dto.locationId ?? null, dto.year);
    if (existing) {
      throw new ConflictError('A calendar for this location and year already exists', 'CALENDAR_EXISTS');
    }
    return this.holidays.createCalendar({
      companyId,
      locationId: dto.locationId ?? null,
      year: dto.year,
      name: dto.name,
    });
  }

  listCalendars(companyId: string, year?: number) {
    return this.holidays.listCalendars(companyId, year);
  }

  async addHoliday(companyId: string, calendarId: string, dto: AddHolidayDto) {
    const calendar = await this.holidays.findCalendarById(companyId, calendarId);
    if (!calendar) {
      throw new NotFoundError('Holiday calendar not found');
    }
    try {
      return await this.holidays.addHoliday({
        calendarId,
        date: new Date(dto.date),
        name: dto.name,
        isOptional: dto.isOptional ?? false,
      });
    } catch (e) {
      if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
        throw new ConflictError('A holiday already exists on this date', 'HOLIDAY_EXISTS');
      }
      throw e;
    }
  }

  async listHolidays(companyId: string, calendarId: string) {
    const calendar = await this.holidays.findCalendarById(companyId, calendarId);
    if (!calendar) {
      throw new NotFoundError('Holiday calendar not found');
    }
    return this.holidays.listHolidays(calendarId);
  }

  /**
   * Resolves the effective holiday list for a location/year: a location-specific
   * calendar if present, otherwise the company-wide one. Consumed by Leaves.
   */
  async getEffectiveCalendar(
    companyId: string,
    locationId: string | null,
    year: number,
  ): Promise<Holiday[]> {
    let calendar = locationId
      ? await this.holidays.findCalendar(companyId, locationId, year)
      : null;
    if (!calendar) {
      calendar = await this.holidays.findCalendar(companyId, null, year);
    }
    if (!calendar) return [];
    return this.holidays.listHolidays(calendar.id);
  }
}
