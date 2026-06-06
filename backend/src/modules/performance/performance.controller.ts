import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { PerformanceService } from './performance.service';
import {
  CreateCycleDto,
  CreateGoalDto,
  CreateReviewDto,
  CycleStatusDto,
  SubmitReviewDto,
  UpdateGoalDto,
} from './dto/performance.dto';

@ApiTags('performance')
@ApiBearerAuth()
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  // Goals
  @Get('goals')
  @Roles(RoleName.EMPLOYEE)
  listGoals(@CurrentUser() u: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.performance.listGoals(u, employeeId);
  }

  @Post('goals')
  @Roles(RoleName.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  createGoal(@CurrentUser() u: AuthUser, @Body() dto: CreateGoalDto) {
    return this.performance.createGoal(u, dto);
  }

  @Patch('goals/:id')
  @Roles(RoleName.EMPLOYEE)
  updateGoal(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.performance.updateGoal(u, id, dto);
  }

  // Review cycles
  @Get('cycles')
  @Roles(RoleName.EMPLOYEE)
  listCycles(@CurrentUser() u: AuthUser) {
    return this.performance.listCycles(u);
  }

  @Post('cycles')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createCycle(@CurrentUser() u: AuthUser, @Body() dto: CreateCycleDto) {
    return this.performance.createCycle(u, dto);
  }

  @Patch('cycles/:id/status')
  @Roles(RoleName.HR_ADMIN)
  setCycleStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: CycleStatusDto) {
    return this.performance.setCycleStatus(u, id, dto);
  }

  // Reviews
  @Get('reviews')
  @Roles(RoleName.EMPLOYEE)
  listReviews(@CurrentUser() u: AuthUser, @Query('cycleId') cycleId?: string) {
    return this.performance.listReviews(u, cycleId);
  }

  @Post('reviews')
  @Roles(RoleName.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  createReview(@CurrentUser() u: AuthUser, @Body() dto: CreateReviewDto) {
    return this.performance.createReview(u, dto);
  }

  @Patch('reviews/:id/submit')
  @Roles(RoleName.MANAGER)
  submitReview(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.performance.submitReview(u, id, dto);
  }
}
