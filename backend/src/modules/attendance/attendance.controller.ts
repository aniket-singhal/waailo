import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { AttendanceService } from './attendance.service';
import {
  AttendanceRangeQueryDto,
  CheckInDto,
  DecisionDto,
  RegularisationRequestDto,
} from './dto/attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('check-in')
  @Roles(RoleName.EMPLOYEE)
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto) {
    return this.attendance.checkIn(user, dto);
  }

  @Post('check-out')
  @Roles(RoleName.EMPLOYEE)
  checkOut(@CurrentUser() user: AuthUser) {
    return this.attendance.checkOut(user);
  }

  @Get()
  @Roles(RoleName.EMPLOYEE)
  list(@CurrentUser() user: AuthUser, @Query() query: AttendanceRangeQueryDto) {
    return this.attendance.listRange(user, query);
  }

  @Get('summary')
  @Roles(RoleName.EMPLOYEE)
  summary(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.attendance.monthlySummary(user, employeeId, Number(month), Number(year));
  }

  @Get('report')
  @Roles(RoleName.MANAGER)
  report(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.attendance.report(user, Number(month), Number(year));
  }

  @Get('regularisations/pending')
  @Roles(RoleName.MANAGER)
  pending(@CurrentUser() user: AuthUser) {
    return this.attendance.listPendingRegularisations(user);
  }

  @Post('regularisations')
  @Roles(RoleName.EMPLOYEE)
  requestRegularisation(@CurrentUser() user: AuthUser, @Body() dto: RegularisationRequestDto) {
    return this.attendance.requestRegularisation(user, dto);
  }

  @Patch('regularisations/:id')
  @Roles(RoleName.MANAGER)
  decide(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DecisionDto) {
    return this.attendance.decide(user, id, dto);
  }
}
