import { apiFetch } from './client';
import type { Shift, ShiftAssignment } from './types';

export const listShifts = () => apiFetch<Shift[]>('/shifts');

export const createShift = (input: {
  name: string;
  startTime: string;
  endTime: string;
  workingDays?: string;
}) => apiFetch<Shift>('/shifts', { method: 'POST', body: input });

export const myShift = () =>
  apiFetch<{ assignment: ShiftAssignment | null; shift: Shift | null }>('/shifts/my');

export const listAssignments = (employeeId?: string) =>
  apiFetch<ShiftAssignment[]>(`/shifts/assignments${employeeId ? `?employeeId=${employeeId}` : ''}`);

export const assignShift = (input: {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}) => apiFetch<ShiftAssignment>('/shifts/assignments', { method: 'POST', body: input });
