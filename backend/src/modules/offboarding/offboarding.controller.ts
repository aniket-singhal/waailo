import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { OffboardingService } from './offboarding.service';
import { InitiateExitDto, ToggleTaskDto, UpdateExitStatusDto } from './dto/offboarding.dto';

@ApiTags('offboarding')
@ApiBearerAuth()
@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly offboarding: OffboardingService) {}

  @Get()
  @Roles(RoleName.HR_ADMIN)
  list(@CurrentUser() u: AuthUser) {
    return this.offboarding.list(u);
  }

  @Post()
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  initiate(@CurrentUser() u: AuthUser, @Body() dto: InitiateExitDto) {
    return this.offboarding.initiate(u, dto);
  }

  @Get(':id')
  @Roles(RoleName.HR_ADMIN)
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.offboarding.get(u, id);
  }

  @Patch(':id/status')
  @Roles(RoleName.HR_ADMIN)
  updateStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateExitStatusDto) {
    return this.offboarding.updateStatus(u, id, dto);
  }

  @Patch('tasks/:taskId')
  @Roles(RoleName.HR_ADMIN)
  toggleTask(@CurrentUser() u: AuthUser, @Param('taskId') taskId: string, @Body() dto: ToggleTaskDto) {
    return this.offboarding.toggleTask(u, taskId, dto);
  }
}
