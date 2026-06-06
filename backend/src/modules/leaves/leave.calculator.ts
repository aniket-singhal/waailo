/** Pure leave math (unit-tested): working-day counts and overlap checks. */

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const LeaveCalculator = {
  /**
   * Counts working days in [start, end] inclusive, excluding weekly-offs and
   * holidays. `weeklyOff` uses JS getUTCDay() (0 = Sunday).
   */
  workingDays(
    start: Date,
    end: Date,
    holidayKeys: Set<string> = new Set(),
    weeklyOff: number[] = [0],
  ): number {
    if (end.getTime() < start.getTime()) return 0;
    let count = 0;
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    while (cursor.getTime() <= last.getTime()) {
      const isOff = weeklyOff.includes(cursor.getUTCDay());
      const isHoliday = holidayKeys.has(toKey(cursor));
      if (!isOff && !isHoliday) count += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
  },

  /** Whether two inclusive date ranges overlap. */
  hasOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
  },

  toKey,
};
