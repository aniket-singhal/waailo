import { apiFetch } from './client';
import type { Candidate, Interview, JobOpening } from './types';

export const listJobs = () => apiFetch<JobOpening[]>('/recruitment/jobs');
export const getJob = (id: string) => apiFetch<JobOpening>(`/recruitment/jobs/${id}`);
export const createJob = (input: {
  title: string;
  description?: string;
  employmentType?: string;
  openings?: number;
}) => apiFetch<JobOpening>('/recruitment/jobs', { method: 'POST', body: input });
export const setJobStatus = (id: string, status: 'OPEN' | 'ON_HOLD' | 'CLOSED') =>
  apiFetch<JobOpening>(`/recruitment/jobs/${id}/status`, { method: 'PATCH', body: { status } });

export const listCandidates = (jobId: string) =>
  apiFetch<Candidate[]>(`/recruitment/candidates?jobId=${jobId}`);
export const addCandidate = (
  jobId: string,
  input: { firstName: string; lastName: string; email: string; phone?: string; source?: string },
) => apiFetch<Candidate>(`/recruitment/jobs/${jobId}/candidates`, { method: 'POST', body: input });
export const advanceCandidate = (id: string) =>
  apiFetch<unknown>(`/recruitment/candidates/${id}/advance`, { method: 'POST', body: {} });
export const rejectCandidate = (id: string) =>
  apiFetch<Candidate>(`/recruitment/candidates/${id}/reject`, { method: 'POST', body: {} });
export const hireCandidate = (id: string) =>
  apiFetch<{ candidateId: string; employeeId: string; inviteToken: string }>(
    `/recruitment/candidates/${id}/hire`,
    { method: 'POST', body: {} },
  );

export const listInterviews = (candidateId: string) =>
  apiFetch<Interview[]>(`/recruitment/candidates/${candidateId}/interviews`);
export const scheduleInterview = (
  candidateId: string,
  input: { scheduledAt: string; mode?: string },
) =>
  apiFetch<Interview>(`/recruitment/candidates/${candidateId}/interviews`, {
    method: 'POST',
    body: input,
  });

export const makeOffer = (candidateId: string, input: { ctcAnnual: number; joiningDate: string }) =>
  apiFetch<unknown>(`/recruitment/candidates/${candidateId}/offer`, { method: 'POST', body: input });
