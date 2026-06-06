import { NotificationChannel } from '@prisma/client';

/** Stable event keys (also used to resolve notification templates). */
export const EventKey = {
  EmployeeInvited: 'EmployeeInvited',
  LeaveRequested: 'LeaveRequested',
  LeaveDecided: 'LeaveDecided',
  RegularisationRequested: 'RegularisationRequested',
  RegularisationDecided: 'RegularisationDecided',
} as const;

export type EventKeyType = (typeof EventKey)[keyof typeof EventKey];

/**
 * A domain event carries just enough to deliver a notification: who it's for,
 * which template to use, and the data to render. Producers publish these; the
 * Notifications context subscribes. Identifiers, not whole entities.
 */
export interface DomainEvent {
  key: EventKeyType;
  companyId: string;
  /** Recipient address (email or phone) for the notification. */
  recipient: string;
  channel?: NotificationChannel;
  /** Template variables, e.g. { firstName, startDate, decision }. */
  data: Record<string, unknown>;
}
