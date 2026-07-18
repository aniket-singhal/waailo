import { apiFetch } from './client';
import type { Employee, EmployeeStatus, Paginated } from './types';

export interface EmployeeQuery {
  page?: number;
  pageSize?: number;
  status?: EmployeeStatus;
  search?: string;
  departmentId?: string;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfJoining: string;
  employmentType?: string;
  employeeCode?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  managerId?: string;
  // personal
  personalEmail?: string;
  alternatePhone?: string;
  gender?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  // extended org
  businessUnitId?: string;
  gradeId?: string;
  costCenterId?: string;
  reviewingManagerId?: string;
  departmentHeadId?: string;
  holidayCalendarId?: string;
  // payroll / statutory
  payrollActive?: boolean;
  panRef?: string;
  uan?: string;
  esiNumber?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
}

export type InviteEmployeeInput = CreateEmployeeInput & {
  asManager?: boolean;
  role?: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';
};

function toQueryString(q: EmployeeQuery): string {
  const params = new URLSearchParams();
  if (q.page) params.set('page', String(q.page));
  if (q.pageSize) params.set('pageSize', String(q.pageSize));
  if (q.status) params.set('status', q.status);
  if (q.search) params.set('search', q.search);
  if (q.departmentId) params.set('departmentId', q.departmentId);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const listEmployees = (q: EmployeeQuery = {}) =>
  apiFetch<Paginated<Employee>>(`/employees${toQueryString(q)}`);

export const getEmployee = (id: string) => apiFetch<Employee>(`/employees/${id}`);

export const createEmployee = (input: CreateEmployeeInput) =>
  apiFetch<Employee>('/employees', { method: 'POST', body: input });

export const inviteEmployee = (input: InviteEmployeeInput) =>
  apiFetch<Employee & { inviteToken: string }>('/employees/invite', {
    method: 'POST',
    body: input,
  });

export const updateEmployee = (id: string, input: Partial<CreateEmployeeInput>) =>
  apiFetch<Employee>(`/employees/${id}`, { method: 'PATCH', body: input });

export const changeEmployeeStatus = (id: string, status: EmployeeStatus) =>
  apiFetch<Employee>(`/employees/${id}/status`, { method: 'PATCH', body: { status } });

export interface SalaryComponentInput {
  code: string;
  label: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number; // annual, in paise
}

export const setSalary = (
  id: string,
  input: { ctcAnnual: number; components: SalaryComponentInput[]; effectiveFrom: string },
) => apiFetch<unknown>(`/employees/${id}/salary`, { method: 'PUT', body: input });
