import { apiFetch } from './client';
import type { ExitRecord, ExitStatus, ExitTask, ExitType } from './types';

export const listExits = () => apiFetch<ExitRecord[]>('/offboarding');

export const getExit = (id: string) => apiFetch<ExitRecord>(`/offboarding/${id}`);

export const initiateExit = (input: {
  employeeId: string;
  type: ExitType;
  reason?: string;
  noticeDate: string;
  lastWorkingDay: string;
}) => apiFetch<ExitRecord>('/offboarding', { method: 'POST', body: input });

export const updateExitStatus = (
  id: string,
  input: { status: ExitStatus; exitInterview?: string; rehireEligible?: boolean },
) => apiFetch<ExitRecord>(`/offboarding/${id}/status`, { method: 'PATCH', body: input });

export const toggleExitTask = (taskId: string, done: boolean) =>
  apiFetch<ExitTask>(`/offboarding/tasks/${taskId}`, { method: 'PATCH', body: { done } });
