import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { OnboardingService } from './onboarding.service';
import { ReviewOnboardingDto, SaveOnboardingDto, UploadDocTypeDto } from './dto/onboarding.dto';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  // ---- Employee self-service ----
  @Get('me')
  @Roles(RoleName.EMPLOYEE)
  getMine(@CurrentUser() u: AuthUser) {
    return this.onboarding.getMine(u);
  }

  @Put('me')
  @Roles(RoleName.EMPLOYEE)
  saveMine(@CurrentUser() u: AuthUser, @Body() dto: SaveOnboardingDto) {
    return this.onboarding.saveMine(u, dto);
  }

  @Post('me/submit')
  @Roles(RoleName.EMPLOYEE)
  submitMine(@CurrentUser() u: AuthUser) {
    return this.onboarding.submitMine(u);
  }

  @Post('me/documents')
  @Roles(RoleName.EMPLOYEE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadMine(
    @CurrentUser() u: AuthUser,
    @UploadedFile() file: UploadedFileLike,
    @Body() dto: UploadDocTypeDto,
  ) {
    return this.onboarding.uploadMine(u, file, dto.docType);
  }

  @Get('documents/:id/download')
  @Roles(RoleName.EMPLOYEE)
  async download(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, mimeType, filename } = await this.onboarding.downloadDoc(u, id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // ---- HR review ----
  @Get()
  @Roles(RoleName.HR_ADMIN)
  list(@CurrentUser() u: AuthUser) {
    return this.onboarding.list(u);
  }

  @Get(':employeeId')
  @Roles(RoleName.HR_ADMIN)
  getFor(@CurrentUser() u: AuthUser, @Param('employeeId') employeeId: string) {
    return this.onboarding.getFor(u, employeeId);
  }

  @Patch(':employeeId/review')
  @Roles(RoleName.HR_ADMIN)
  review(
    @CurrentUser() u: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: ReviewOnboardingDto,
  ) {
    return this.onboarding.review(u, employeeId, dto);
  }
}
