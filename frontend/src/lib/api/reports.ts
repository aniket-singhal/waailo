import { apiFetch } from './client';
import type { ReportsOverview } from './types';

export const getOverview = () => apiFetch<ReportsOverview>('/reports/overview');
