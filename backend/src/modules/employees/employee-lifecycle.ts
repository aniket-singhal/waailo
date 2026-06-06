import { EmployeeStatus } from '@prisma/client';

/**
 * Employee lifecycle state machine (see docs/03-domain-model.md §3.5).
 * Pure and side-effect free so it is exhaustively unit-testable.
 */
export const EMPLOYEE_TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  INVITED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['ON_NOTICE', 'SUSPENDED'],
  ON_NOTICE: ['EXITED', 'ACTIVE'],
  SUSPENDED: ['ACTIVE'],
  EXITED: [],
  CANCELLED: [],
};

export function canTransition(from: EmployeeStatus, to: EmployeeStatus): boolean {
  return EMPLOYEE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: EmployeeStatus): boolean {
  return EMPLOYEE_TRANSITIONS[status].length === 0;
}
