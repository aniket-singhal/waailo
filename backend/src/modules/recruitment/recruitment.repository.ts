import { Injectable } from '@nestjs/common';
import {
  Candidate,
  CandidateStage,
  Interview,
  JobOpening,
  JobStatus,
  Offer,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RecruitmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Jobs ----
  createJob(data: Prisma.JobOpeningUncheckedCreateInput): Promise<JobOpening> {
    return this.prisma.jobOpening.create({ data });
  }
  listJobs(companyId: string): Promise<JobOpening[]> {
    return this.prisma.jobOpening.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }
  findJob(companyId: string, id: string): Promise<JobOpening | null> {
    return this.prisma.jobOpening.findFirst({ where: { id, companyId } });
  }
  updateJob(id: string, data: { status?: JobStatus }): Promise<JobOpening> {
    return this.prisma.jobOpening.update({ where: { id }, data });
  }
  countCandidates(companyId: string, jobOpeningId: string): Promise<number> {
    return this.prisma.candidate.count({ where: { companyId, jobOpeningId } });
  }

  // ---- Candidates ----
  createCandidate(data: Prisma.CandidateUncheckedCreateInput): Promise<Candidate> {
    return this.prisma.candidate.create({ data });
  }
  listCandidates(companyId: string, jobOpeningId?: string): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({
      where: { companyId, ...(jobOpeningId ? { jobOpeningId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  findCandidate(companyId: string, id: string): Promise<Candidate | null> {
    return this.prisma.candidate.findFirst({ where: { id, companyId } });
  }
  updateCandidate(id: string, data: { stage?: CandidateStage; notes?: string }): Promise<Candidate> {
    return this.prisma.candidate.update({ where: { id }, data });
  }

  // ---- Interviews ----
  createInterview(data: Prisma.InterviewUncheckedCreateInput): Promise<Interview> {
    return this.prisma.interview.create({ data });
  }
  listInterviews(companyId: string, candidateId: string): Promise<Interview[]> {
    return this.prisma.interview.findMany({
      where: { companyId, candidateId },
      orderBy: { scheduledAt: 'asc' },
    });
  }
  findInterview(companyId: string, id: string): Promise<Interview | null> {
    return this.prisma.interview.findFirst({ where: { id, companyId } });
  }
  updateInterview(
    id: string,
    data: { status?: Interview['status']; rating?: number; feedback?: string },
  ): Promise<Interview> {
    return this.prisma.interview.update({ where: { id }, data });
  }

  // ---- Offers ----
  createOffer(data: Prisma.OfferUncheckedCreateInput): Promise<Offer> {
    return this.prisma.offer.create({ data });
  }
  findOffer(companyId: string, id: string): Promise<Offer | null> {
    return this.prisma.offer.findFirst({ where: { id, companyId } });
  }
  latestOfferForCandidate(companyId: string, candidateId: string): Promise<Offer | null> {
    return this.prisma.offer.findFirst({
      where: { companyId, candidateId },
      orderBy: { createdAt: 'desc' },
    });
  }
  updateOffer(id: string, data: { status?: Offer['status'] }): Promise<Offer> {
    return this.prisma.offer.update({ where: { id }, data });
  }
}
