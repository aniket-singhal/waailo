import { apiFetch } from './client';
import type { NotificationItem, Paginated } from './types';

export const listNotifications = (page = 1, pageSize = 20) =>
  apiFetch<Paginated<NotificationItem>>(`/notifications?page=${page}&pageSize=${pageSize}`);
