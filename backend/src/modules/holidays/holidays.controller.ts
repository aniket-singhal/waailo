import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { HolidaysService } from './holidays.service';
import { AddHolidayDto, CreateCalendarDto } from './dto/holiday.dto';

@ApiTags('holidays')
@ApiBearerAuth()
@Controller('holiday-calendars')
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @Roles(RoleName.EMPLOYEE)
  list(@CurrentUser() user: AuthUser, @Query('year') year?: string) {
    return this.holidays.listCalendars(user.companyId, year ? Number(year) : undefined);
  }

  @Post()
  @Roles(RoleName.HR_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCalendarDto) {
    return this.holidays.createCalendar(user.companyId, dto);
  }

  @Get(':id/holidays')
  @Roles(RoleName.EMPLOYEE)
  listHolidays(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.holidays.listHolidays(user.companyId, id);
  }

  @Post(':id/holidays')
  @Roles(RoleName.HR_ADMIN)
  addHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddHolidayDto) {
    return this.holidays.addHoliday(user.companyId, id, dto);
  }
}
