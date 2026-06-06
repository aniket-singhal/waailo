import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { NotificationService } from './notification.service';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationQueryDto } from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly templates: NotificationTemplateRepository,
  ) {}

  @Get('notifications')
  @Roles(RoleName.HR_ADMIN)
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notifications.list(user.companyId, query.page, query.pageSize);
  }

  @Get('notification-templates')
  @Roles(RoleName.HR_ADMIN)
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.templates.list(user.companyId);
  }
}
