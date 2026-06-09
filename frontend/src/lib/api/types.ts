// Mirrored API contract types (Phase 1). Kept in sync with the backend DTOs by
// hand for now; can be extracted to a shared @waailo/contracts package later.

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type RoleName = 'OWNER' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface Me {
  userId: string;
  companyId: string;
  email: string;
  roles: RoleName[];
  employeeId: string | null;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  status: string;
  settings: Record<string, unknown>;
}

export interface SignupResponse {
  company: Company;
  tokens: TokenPair;
}

export interface Department {
  id: string;
  name: string;
}
export interface Designation {
  id: string;
  title: string;
}
export interface Location {
  id: string;
  name: string;
  timezone: string;
  geoLat?: number | null;
  geoLng?: number | null;
  geoRadiusM?: number | null;
}

export type EmployeeStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'ON_NOTICE'
  | 'SUSPENDED'
  | 'EXITED'
  | 'CANCELLED';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employmentType: string;
  status: EmployeeStatus;
  dateOfJoining: string;
  departmentId: string | null;
  designationId: string | null;
  locationId: string | null;
  managerId: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  accessLevel: string;
  ownerEmployeeId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// ---- Phase 2 ----
export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKLY_OFF';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workMode: string;
  status: AttendanceStatus;
  workedMinutes: number;
  withinGeofence?: boolean | null;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  workingDays: string;
}

export type DayStatus =
  | 'PRESENT'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND'
  | 'NONE';

export interface AttendanceReportRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  days: { date: string; status: DayStatus }[];
  counts: {
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    holiday: number;
    weekend: number;
  };
  workedHours: number;
  payableDays: number;
}

export interface AttendanceReport {
  month: number;
  year: number;
  daysInMonth: number;
  rows: AttendanceReportRow[];
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  shift: Shift;
}

export interface AttendanceSummary {
  month: number;
  year: number;
  employeeId: string;
  summary: Record<string, number>;
  workedMinutes: number;
  paidDays: number;
}

export interface RegularisationRequest {
  id: string;
  attendanceId: string;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: string;
  createdAt: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
  color: string | null;
}

export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  periodYear: number;
  entitled: number;
  accrued: number;
  used: number;
  pending: number;
  available: number;
}

export type RequestStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: RequestStatus;
  decisionNote: string | null;
}

export interface HolidayCalendar {
  id: string;
  locationId: string | null;
  year: number;
  name: string;
}

export interface Holiday {
  id: string;
  calendarId: string;
  date: string;
  name: string;
  isOptional: boolean;
}

export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PAID';

export interface PayrollRun {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: PayrollStatus;
  totalGross: number;
  totalNet: number;
  processedAt: string | null;
}

export interface PayslipLine {
  type: 'EARNING' | 'DEDUCTION';
  code: string;
  label: string;
  amount: number;
  isStatutory: boolean;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  gross: number;
  totalDeductions: number;
  net: number;
  paidAt: string | null;
  lines: PayslipLine[];
}

export interface NotificationItem {
  id: string;
  eventKey: string;
  channel: string;
  recipient: string;
  status: string;
  createdAt: string;
}

// ---- Recruitment ----
export type CandidateStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export interface JobOpening {
  id: string;
  title: string;
  description: string | null;
  employmentType: string;
  openings: number;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
  candidateCount?: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  jobOpeningId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string | null;
  stage: CandidateStage;
  createdAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  scheduledAt: string;
  mode: string;
  status: string;
  rating: number | null;
  feedback: string | null;
}

// ---- Performance ----
export interface Goal {
  id: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  description: string | null;
  progress: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  dueDate: string | null;
}

export interface ReviewCycle {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export interface Review {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName?: string;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  comments: string | null;
  status: 'PENDING' | 'SUBMITTED';
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field?: string; issue: string }[];
  requestId?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { field?: string; issue: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
