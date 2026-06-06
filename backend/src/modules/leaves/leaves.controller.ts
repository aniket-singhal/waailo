import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { LeavesService } from './leaves.service';
import {
  ApplyLeaveDto,
  BalancesQueryDto,
  CreateLeavePolicyDto,
  CreateLeaveTypeDto,
  LeaveDecisionDto,
} from './dto/leave.dto';

@ApiTags('leaves')
@ApiBearerAuth()
@Controller()
export class LeavesController {
  constructor(private readonly leaves: LeavesService) {}

  @Get('leave-types')
  @Roles(RoleName.EMPLOYEE)
  listTypes(@CurrentUser() user: AuthUser) {
    return this.leaves.listTypes(user.companyId);
  }

  @Post('leave-types')
  @Roles(RoleName.HR_ADMIN)
  createType(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveTypeDto) {
    return this.leaves.createType(user.companyId, dto);
  }

  @Post('leave-policies')
  @Roles(RoleName.HR_ADMIN)
  createPolicy(@CurrentUser() user: AuthUser, @Body() dto: CreateLeavePolicyDto) {
    return this.leaves.createPolicy(user.companyId, dto);
  }

  @Get('leave-balances')
  @Roles(RoleName.EMPLOYEE)
  balances(@CurrentUser() user: AuthUser, @Query() query: BalancesQueryDto) {
    return this.leaves.getBalances(user, query.employeeId, query.year);
  }

  @Get('leave-requests')
  @Roles(RoleName.EMPLOYEE)
  listRequests(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.leaves.listRequests(user, status);
  }

  @Get('leave-requests/pending')
  @Roles(RoleName.MANAGER)
  pending(@CurrentUser() user: AuthUser) {
    return this.leaves.listPending(user);
  }

  @Post('leave-requests')
  @Roles(RoleName.EMPLOYEE)
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyLeaveDto) {
    return this.leaves.apply(user, dto);
  }

  @Patch('leave-requests/:id')
  @Roles(RoleName.MANAGER)
  decide(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: LeaveDecisionDto) {
    return this.leaves.decide(user, id, dto);
  }

  @Post('leave-requests/:id/cancel')
  @Roles(RoleName.EMPLOYEE)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaves.cancel(user, id);
  }

  @Get('leaves/calendar')
  @Roles(RoleName.EMPLOYEE)
  calendar(@CurrentUser() user: AuthUser, @Query('from') from: string, @Query('to') to: string) {
    return this.leaves.calendar(user, from, to);
  }
}
