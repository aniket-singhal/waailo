import { apiFetch } from './client';
import type { LeaveBalance, LeaveRequest, LeaveType } from './types';

export const listLeaveTypes = () => apiFetch<LeaveType[]>('/leave-types');

export const createLeaveType = (input: {
  code: string;
  name: string;
  isPaid?: boolean;
  color?: string;
}) => apiFetch<LeaveType>('/leave-types', { method: 'POST', body: input });

export const createLeavePolicy = (input: {
  leaveTypeId: string;
  annualQuota: number;
  maxCarryForward?: number;
  minPerRequest?: number;
  maxPerRequest?: number;
  effectiveFrom: string;
}) => apiFetch<unknown>('/leave-policies', { method: 'POST', body: input });

export const getBalances = (year?: number, employeeId?: string) => {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (employeeId) params.set('employeeId', employeeId);
  const qs = params.toString();
  return apiFetch<LeaveBalance[]>(`/leave-balances${qs ? `?${qs}` : ''}`);
};

export const listLeaveRequests = (status?: string) =>
  apiFetch<LeaveRequest[]>(`/leave-requests${status ? `?status=${status}` : ''}`);

export const listPendingLeaves = () => apiFetch<LeaveRequest[]>('/leave-requests/pending');

export const applyLeave = (input: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) => apiFetch<LeaveRequest>('/leave-requests', { method: 'POST', body: input });

export const decideLeave = (id: string, decision: 'APPROVE' | 'REJECT', note?: string) =>
  apiFetch<LeaveRequest>(`/leave-requests/${id}`, { method: 'PATCH', body: { decision, note } });

export const cancelLeave = (id: string) =>
  apiFetch<LeaveRequest>(`/leave-requests/${id}/cancel`, { method: 'POST', body: {} });
