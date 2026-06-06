import { apiFetch } from './client';
import type { Holiday, HolidayCalendar } from './types';

export const listCalendars = (year?: number) =>
  apiFetch<HolidayCalendar[]>(`/holiday-calendars${year ? `?year=${year}` : ''}`);

export const createCalendar = (input: { year: number; name: string; locationId?: string }) =>
  apiFetch<HolidayCalendar>('/holiday-calendars', { method: 'POST', body: input });

export const listHolidays = (calendarId: string) =>
  apiFetch<Holiday[]>(`/holiday-calendars/${calendarId}/holidays`);

export const addHoliday = (
  calendarId: string,
  input: { date: string; name: string; isOptional?: boolean },
) => apiFetch<Holiday>(`/holiday-calendars/${calendarId}/holidays`, { method: 'POST', body: input });
