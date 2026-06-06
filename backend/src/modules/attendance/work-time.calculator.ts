import { AttendanceStatus } from '@prisma/client';

const FULL_DAY_MINUTES = 8 * 60;
const HALF_DAY_MINUTES = 4 * 60;

/** Pure, side-effect-free attendance time helpers (unit-tested). */
export const WorkTimeCalculator = {
  /** Whole minutes between check-in and check-out (0 if invalid/negative). */
  workedMinutes(checkIn: Date, checkOut: Date): number {
    const ms = checkOut.getTime() - checkIn.getTime();
    if (ms <= 0) return 0;
    return Math.floor(ms / 60000);
  },

  /** Derives a present/half-day/absent status from minutes worked. */
  deriveStatus(minutes: number): AttendanceStatus {
    if (minutes >= HALF_DAY_MINUTES && minutes < FULL_DAY_MINUTES) {
      return AttendanceStatus.HALF_DAY;
    }
    if (minutes >= FULL_DAY_MINUTES) {
      return AttendanceStatus.PRESENT;
    }
    if (minutes > 0) {
      return AttendanceStatus.HALF_DAY;
    }
    return AttendanceStatus.ABSENT;
  },

  FULL_DAY_MINUTES,
  HALF_DAY_MINUTES,
};
