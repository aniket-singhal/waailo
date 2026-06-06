import { apiFetch } from './client';
import type { Goal, Review, ReviewCycle } from './types';

export const listGoals = (employeeId?: string) =>
  apiFetch<Goal[]>(`/performance/goals${employeeId ? `?employeeId=${employeeId}` : ''}`);
export const createGoal = (input: {
  title: string;
  description?: string;
  employeeId?: string;
  dueDate?: string;
}) => apiFetch<Goal>('/performance/goals', { method: 'POST', body: input });
export const updateGoal = (
  id: string,
  input: { progress?: number; status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' },
) => apiFetch<Goal>(`/performance/goals/${id}`, { method: 'PATCH', body: input });

export const listCycles = () => apiFetch<ReviewCycle[]>('/performance/cycles');
export const createCycle = (input: { name: string; periodStart: string; periodEnd: string }) =>
  apiFetch<ReviewCycle>('/performance/cycles', { method: 'POST', body: input });
export const setCycleStatus = (id: string, status: 'DRAFT' | 'OPEN' | 'CLOSED') =>
  apiFetch<ReviewCycle>(`/performance/cycles/${id}/status`, { method: 'PATCH', body: { status } });

export const listReviews = (cycleId?: string) =>
  apiFetch<Review[]>(`/performance/reviews${cycleId ? `?cycleId=${cycleId}` : ''}`);
export const createReview = (input: { cycleId: string; employeeId: string }) =>
  apiFetch<Review>('/performance/reviews', { method: 'POST', body: input });
export const submitReview = (
  id: string,
  input: { rating?: number; strengths?: string; improvements?: string; comments?: string },
) => apiFetch<Review>(`/performance/reviews/${id}/submit`, { method: 'PATCH', body: input });
