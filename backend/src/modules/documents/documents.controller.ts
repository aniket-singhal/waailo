import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { DocumentsService } from './documents.service';
import { ConfirmUploadDto, DocumentQueryDto, UploadIntentDto } from './dto/document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('upload-intent')
  @Roles(RoleName.EMPLOYEE)
  createUploadIntent(@CurrentUser() user: AuthUser, @Body() dto: UploadIntentDto) {
    return this.documents.createUploadIntent(user.companyId, dto);
  }

  @Post('confirm')
  @Roles(RoleName.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmUploadDto) {
    return this.documents.confirmUpload(user.companyId, dto);
  }

  @Get()
  @Roles(RoleName.EMPLOYEE)
  list(@CurrentUser() user: AuthUser, @Query() query: DocumentQueryDto) {
    return this.documents.list(user, query);
  }

  @Get(':id/download')
  @Roles(RoleName.EMPLOYEE)
  download(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.getDownloadUrl(user, id);
  }

  @Delete(':id')
  @Roles(RoleName.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.documents.softDelete(user, id);
  }
}
