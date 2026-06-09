import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { ShiftsService } from './shifts.service';
import { AssignShiftDto, CreateShiftDto } from './dto/shifts.dto';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  @Roles(RoleName.EMPLOYEE)
  list(@CurrentUser() u: AuthUser) {
    return this.shifts.listShifts(u.companyId);
  }

  @Post()
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateShiftDto) {
    return this.shifts.createShift(u.companyId, dto);
  }

  @Get('my')
  @Roles(RoleName.EMPLOYEE)
  my(@CurrentUser() u: AuthUser) {
    return this.shifts.myShift(u);
  }

  @Get('assignments')
  @Roles(RoleName.MANAGER)
  listAssignments(@CurrentUser() u: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.shifts.listAssignments(u.companyId, employeeId);
  }

  @Post('assignments')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  assign(@CurrentUser() u: AuthUser, @Body() dto: AssignShiftDto) {
    return this.shifts.assign(u.companyId, dto);
  }
}
