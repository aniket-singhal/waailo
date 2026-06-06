import { WorkTimeCalculator } from 'src/modules/attendance/work-time.calculator';

describe('WorkTimeCalculator.workedMinutes', () => {
  it('computes whole minutes between check-in and check-out', () => {
    const inAt = new Date('2026-06-01T09:00:00.000Z');
    const outAt = new Date('2026-06-01T17:30:00.000Z');
    expect(WorkTimeCalculator.workedMinutes(inAt, outAt)).toBe(510);
  });

  it('returns 0 for a check-out before check-in', () => {
    const inAt = new Date('2026-06-01T17:00:00.000Z');
    const outAt = new Date('2026-06-01T09:00:00.000Z');
    expect(WorkTimeCalculator.workedMinutes(inAt, outAt)).toBe(0);
  });
});

describe('WorkTimeCalculator.deriveStatus', () => {
  it('marks a full day present', () => {
    expect(WorkTimeCalculator.deriveStatus(8 * 60)).toBe('PRESENT');
    expect(WorkTimeCalculator.deriveStatus(9 * 60)).toBe('PRESENT');
  });

  it('marks a partial day as half-day', () => {
    expect(WorkTimeCalculator.deriveStatus(5 * 60)).toBe('HALF_DAY');
    expect(WorkTimeCalculator.deriveStatus(60)).toBe('HALF_DAY');
  });

  it('marks zero minutes absent', () => {
    expect(WorkTimeCalculator.deriveStatus(0)).toBe('ABSENT');
  });
});
