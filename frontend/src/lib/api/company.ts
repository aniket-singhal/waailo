import { apiFetch } from './client';
import type { Company, Department, Designation, Location } from './types';

export const getCompany = () => apiFetch<Company>('/company');

export const updateSettings = (payload: { name?: string; settings?: Record<string, unknown> }) =>
  apiFetch<Company>('/company/settings', { method: 'PATCH', body: payload });

export const listDepartments = () => apiFetch<Department[]>('/departments');
export const createDepartment = (name: string) =>
  apiFetch<Department>('/departments', { method: 'POST', body: { name } });

export const listDesignations = () => apiFetch<Designation[]>('/designations');
export const createDesignation = (title: string) =>
  apiFetch<Designation>('/designations', { method: 'POST', body: { title } });

export const listLocations = () => apiFetch<Location[]>('/locations');
export const createLocation = (name: string, timezone?: string) =>
  apiFetch<Location>('/locations', { method: 'POST', body: { name, timezone } });

export const setLocationGeofence = (
  id: string,
  geo: { geoLat: number | null; geoLng: number | null; geoRadiusM: number | null },
) => apiFetch<Location>(`/locations/${id}/geofence`, { method: 'PATCH', body: geo });
