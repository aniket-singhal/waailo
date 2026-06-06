import { LeaveCalculator } from 'src/modules/leaves/leave.calculator';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('LeaveCalculator.workingDays', () => {
  it('counts inclusive weekdays', () => {
    // Mon 2026-06-01 .. Fri 2026-06-05 = 5 working days
    expect(LeaveCalculator.workingDays(d('2026-06-01'), d('2026-06-05'))).toBe(5);
  });

  it('excludes Sundays by default', () => {
    // Sat 2026-06-06 (counted) .. Mon 2026-06-08; Sun 06-07 excluded => 2
    expect(LeaveCalculator.workingDays(d('2026-06-06'), d('2026-06-08'))).toBe(2);
  });

  it('excludes holidays', () => {
    const holidays = new Set(['2026-06-03']);
    expect(LeaveCalculator.workingDays(d('2026-06-01'), d('2026-06-05'), holidays)).toBe(4);
  });

  it('respects a custom weekly-off (Sat+Sun)', () => {
    // 2026-06-01 Mon .. 2026-06-07 Sun; weekend Sat(6)+Sun(0) off => 5 weekdays
    expect(LeaveCalculator.workingDays(d('2026-06-01'), d('2026-06-07'), new Set(), [0, 6])).toBe(5);
  });

  it('returns 0 when end precedes start', () => {
    expect(LeaveCalculator.workingDays(d('2026-06-05'), d('2026-06-01'))).toBe(0);
  });

  it('counts a single working day', () => {
    expect(LeaveCalculator.workingDays(d('2026-06-01'), d('2026-06-01'))).toBe(1);
  });
});

describe('LeaveCalculator.hasOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(
      LeaveCalculator.hasOverlap(d('2026-06-01'), d('2026-06-05'), d('2026-06-04'), d('2026-06-08')),
    ).toBe(true);
  });

  it('treats touching boundaries as overlap', () => {
    expect(
      LeaveCalculator.hasOverlap(d('2026-06-01'), d('2026-06-05'), d('2026-06-05'), d('2026-06-09')),
    ).toBe(true);
  });

  it('returns false for disjoint ranges', () => {
    expect(
      LeaveCalculator.hasOverlap(d('2026-06-01'), d('2026-06-05'), d('2026-06-06'), d('2026-06-09')),
    ).toBe(false);
  });
});
