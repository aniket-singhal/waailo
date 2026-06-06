import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { EmployeesService } from 'src/modules/employees/employees.service';
import { RecruitmentRepository } from './recruitment.repository';
import { canAdvance, canReject, nextStage } from './candidate-stage';
import {
  CreateCandidateDto,
  CreateJobDto,
  CreateOfferDto,
  InterviewFeedbackDto,
  ScheduleInterviewDto,
  UpdateJobStatusDto,
} from './dto/recruitment.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly repo: RecruitmentRepository,
    private readonly employees: EmployeesService,
  ) {}

  // ---- Jobs ----
  createJob(companyId: string, dto: CreateJobDto) {
    return this.repo.createJob({
      companyId,
      title: dto.title,
      description: dto.description,
      departmentId: dto.departmentId,
      locationId: dto.locationId,
      employmentType: dto.employmentType ?? 'FULL_TIME',
      openings: dto.openings ?? 1,
    });
  }

  async listJobs(companyId: string) {
    const jobs = await this.repo.listJobs(companyId);
    const out = [];
    for (const j of jobs) {
      out.push({ ...j, candidateCount: await this.repo.countCandidates(companyId, j.id) });
    }
    return out;
  }

  async getJob(companyId: string, id: string) {
    const job = await this.repo.findJob(companyId, id);
    if (!job) throw new NotFoundError('Job opening not found');
    return job;
  }

  async setJobStatus(companyId: string, id: string, dto: UpdateJobStatusDto) {
    await this.getJob(companyId, id);
    return this.repo.updateJob(id, { status: dto.status });
  }

  // ---- Candidates ----
  async addCandidate(companyId: string, jobId: string, dto: CreateCandidateDto) {
    await this.getJob(companyId, jobId);
    return this.repo.createCandidate({
      companyId,
      jobOpeningId: jobId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      source: dto.source,
    });
  }

  listCandidates(companyId: string, jobId?: string) {
    return this.repo.listCandidates(companyId, jobId);
  }

  private async getCandidate(companyId: string, id: string) {
    const c = await this.repo.findCandidate(companyId, id);
    if (!c) throw new NotFoundError('Candidate not found');
    return c;
  }

  async advanceCandidate(companyId: string, id: string) {
    const c = await this.getCandidate(companyId, id);
    if (!canAdvance(c.stage)) {
      throw new UnprocessableError(`Cannot advance from ${c.stage}`, 'CANNOT_ADVANCE');
    }
    const next = nextStage(c.stage)!;
    // Reaching HIRED must go through the hire flow (creates the employee).
    if (next === 'HIRED') {
      return this.hireCandidate(companyId, id);
    }
    return this.repo.updateCandidate(id, { stage: next });
  }

  async rejectCandidate(companyId: string, id: string) {
    const c = await this.getCandidate(companyId, id);
    if (!canReject(c.stage)) {
      throw new UnprocessableError(`Cannot reject from ${c.stage}`, 'CANNOT_REJECT');
    }
    return this.repo.updateCandidate(id, { stage: 'REJECTED' });
  }

  // ---- Interviews ----
  async scheduleInterview(companyId: string, candidateId: string, dto: ScheduleInterviewDto) {
    await this.getCandidate(companyId, candidateId);
    return this.repo.createInterview({
      companyId,
      candidateId,
      scheduledAt: new Date(dto.scheduledAt),
      mode: dto.mode ?? 'VIDEO',
      interviewerId: dto.interviewerId,
    });
  }

  listInterviews(companyId: string, candidateId: string) {
    return this.repo.listInterviews(companyId, candidateId);
  }

  async recordInterviewFeedback(companyId: string, id: string, dto: InterviewFeedbackDto) {
    const i = await this.repo.findInterview(companyId, id);
    if (!i) throw new NotFoundError('Interview not found');
    return this.repo.updateInterview(id, {
      status: 'COMPLETED',
      rating: dto.rating,
      feedback: dto.feedback,
    });
  }

  // ---- Offers ----
  async makeOffer(companyId: string, candidateId: string, dto: CreateOfferDto) {
    const c = await this.getCandidate(companyId, candidateId);
    if (c.stage === 'HIRED' || c.stage === 'REJECTED') {
      throw new UnprocessableError('Candidate is no longer in the pipeline', 'CANDIDATE_CLOSED');
    }
    const offer = await this.repo.createOffer({
      companyId,
      candidateId,
      ctcAnnual: dto.ctcAnnual,
      joiningDate: new Date(dto.joiningDate),
      status: 'SENT',
    });
    await this.repo.updateCandidate(candidateId, { stage: 'OFFER' });
    return offer;
  }

  /** Converts a candidate into an employee invite and marks them HIRED. */
  async hireCandidate(companyId: string, candidateId: string) {
    const c = await this.getCandidate(companyId, candidateId);
    if (c.stage === 'HIRED') {
      throw new ConflictError('Candidate already hired', 'ALREADY_HIRED');
    }
    const offer = await this.repo.latestOfferForCandidate(companyId, candidateId);
    const joining = offer ? offer.joiningDate : new Date();
    const invited = await this.employees.invite(companyId, {
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      dateOfJoining: joining.toISOString().slice(0, 10),
    });
    if (offer) await this.repo.updateOffer(offer.id, { status: 'ACCEPTED' });
    await this.repo.updateCandidate(candidateId, { stage: 'HIRED' });
    return { candidateId, employeeId: invited.id, inviteToken: invited.inviteToken };
  }
}
