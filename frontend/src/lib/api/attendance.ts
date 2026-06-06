import { apiFetch } from './client';
import type { AttendanceRecord, AttendanceSummary, RegularisationRequest } from './types';

export const checkIn = (workMode?: string) =>
  apiFetch<AttendanceRecord>('/attendance/check-in', { method: 'POST', body: { workMode } });

export const checkOut = () =>
  apiFetch<AttendanceRecord>('/attendance/check-out', { method: 'POST', body: {} });

export const listAttendance = (from: string, to: string, employeeId?: string) => {
  const params = new URLSearchParams({ from, to });
  if (employeeId) params.set('employeeId', employeeId);
  return apiFetch<AttendanceRecord[]>(`/attendance?${params.toString()}`);
};

export const monthlySummary = (month: number, year: number, employeeId?: string) => {
  const params = new URLSearchParams({ month: String(month), year: String(year) });
  if (employeeId) params.set('employeeId', employeeId);
  return apiFetch<AttendanceSummary>(`/attendance/summary?${params.toString()}`);
};

export const requestRegularisation = (input: {
  date: string;
  requestedStatus: string;
  reason: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
}) => apiFetch<RegularisationRequest>('/attendance/regularisations', { method: 'POST', body: input });

export const listPendingRegularisations = () =>
  apiFetch<RegularisationRequest[]>('/attendance/regularisations/pending');

export const decideRegularisation = (id: string, decision: 'APPROVE' | 'REJECT') =>
  apiFetch<RegularisationRequest>(`/attendance/regularisations/${id}`, {
    method: 'PATCH',
    body: { decision },
  });
