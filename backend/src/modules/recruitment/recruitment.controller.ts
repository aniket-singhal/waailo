import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { RecruitmentService } from './recruitment.service';
import {
  CreateCandidateDto,
  CreateJobDto,
  CreateOfferDto,
  InterviewFeedbackDto,
  ScheduleInterviewDto,
  UpdateJobStatusDto,
} from './dto/recruitment.dto';

@ApiTags('recruitment')
@ApiBearerAuth()
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitment: RecruitmentService) {}

  // Jobs
  @Get('jobs')
  @Roles(RoleName.HR_ADMIN)
  listJobs(@CurrentUser() u: AuthUser) {
    return this.recruitment.listJobs(u.companyId);
  }

  @Post('jobs')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createJob(@CurrentUser() u: AuthUser, @Body() dto: CreateJobDto) {
    return this.recruitment.createJob(u.companyId, dto);
  }

  @Get('jobs/:id')
  @Roles(RoleName.HR_ADMIN)
  getJob(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.recruitment.getJob(u.companyId, id);
  }

  @Patch('jobs/:id/status')
  @Roles(RoleName.HR_ADMIN)
  setJobStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateJobStatusDto) {
    return this.recruitment.setJobStatus(u.companyId, id, dto);
  }

  // Candidates
  @Get('candidates')
  @Roles(RoleName.HR_ADMIN)
  listCandidates(@CurrentUser() u: AuthUser, @Query('jobId') jobId?: string) {
    return this.recruitment.listCandidates(u.companyId, jobId);
  }

  @Post('jobs/:id/candidates')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  addCandidate(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: CreateCandidateDto) {
    return this.recruitment.addCandidate(u.companyId, id, dto);
  }

  @Post('candidates/:id/advance')
  @Roles(RoleName.HR_ADMIN)
  advance(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.recruitment.advanceCandidate(u.companyId, id);
  }

  @Post('candidates/:id/reject')
  @Roles(RoleName.HR_ADMIN)
  reject(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.recruitment.rejectCandidate(u.companyId, id);
  }

  @Post('candidates/:id/hire')
  @Roles(RoleName.HR_ADMIN)
  hire(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.recruitment.hireCandidate(u.companyId, id);
  }

  // Interviews
  @Get('candidates/:id/interviews')
  @Roles(RoleName.HR_ADMIN)
  listInterviews(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.recruitment.listInterviews(u.companyId, id);
  }

  @Post('candidates/:id/interviews')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  schedule(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ScheduleInterviewDto) {
    return this.recruitment.scheduleInterview(u.companyId, id, dto);
  }

  @Patch('interviews/:id/feedback')
  @Roles(RoleName.HR_ADMIN)
  feedback(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: InterviewFeedbackDto) {
    return this.recruitment.recordInterviewFeedback(u.companyId, id, dto);
  }

  // Offers
  @Post('candidates/:id/offer')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  offer(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: CreateOfferDto) {
    return this.recruitment.makeOffer(u.companyId, id, dto);
  }
}
