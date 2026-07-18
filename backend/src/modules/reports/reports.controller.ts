import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  @Roles(RoleName.HR_ADMIN)
  overview(@CurrentUser() u: AuthUser) {
    return this.reports.overview(u);
  }
}
