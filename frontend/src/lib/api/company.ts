import { apiFetch } from './client';
import type {
  BusinessUnit,
  Company,
  CostCenter,
  Department,
  Designation,
  Grade,
  Location,
} from './types';

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

export const listBusinessUnits = () => apiFetch<BusinessUnit[]>('/business-units');
export const createBusinessUnit = (name: string) =>
  apiFetch<BusinessUnit>('/business-units', { method: 'POST', body: { name } });

export const listGrades = () => apiFetch<Grade[]>('/grades');
export const createGrade = (name: string) =>
  apiFetch<Grade>('/grades', { method: 'POST', body: { name } });

export const listCostCenters = () => apiFetch<CostCenter[]>('/cost-centers');
export const createCostCenter = (code: string, name: string) =>
  apiFetch<CostCenter>('/cost-centers', { method: 'POST', body: { code, name } });
