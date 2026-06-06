import { EmployeeStatus } from '@prisma/client';
import {
  canTransition,
  isTerminal,
  EMPLOYEE_TRANSITIONS,
} from 'src/modules/employees/employee-lifecycle';

describe('Employee lifecycle', () => {
  it('allows valid transitions', () => {
    expect(canTransition('INVITED', 'ACTIVE')).toBe(true);
    expect(canTransition('ACTIVE', 'ON_NOTICE')).toBe(true);
    expect(canTransition('ON_NOTICE', 'EXITED')).toBe(true);
    expect(canTransition('SUSPENDED', 'ACTIVE')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransition('INVITED', 'EXITED')).toBe(false);
    expect(canTransition('EXITED', 'ACTIVE')).toBe(false);
    expect(canTransition('ACTIVE', 'CANCELLED')).toBe(false);
  });

  it('marks terminal states', () => {
    expect(isTerminal('EXITED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('ACTIVE')).toBe(false);
  });

  it('defines a transition list for every status', () => {
    const all = Object.values(EmployeeStatus);
    for (const status of all) {
      expect(EMPLOYEE_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('never allows a self-transition implicitly', () => {
    const all = Object.values(EmployeeStatus);
    for (const status of all) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});
