'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as att from '@/lib/api/attendance';
import type { AttendanceRecord, RegularisationRequest } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { TeamAttendance } from './team-attendance';

export default function AttendancePage() {
  const { hasRole } = useAuth();
  // Managers/HR get the team muster-roll + summary; employees get self check-in.
  return hasRole('MANAGER') ? <TeamAttendance /> : <MyAttendance />;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function MyAttendance() {
  const { hasRole } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pending, setPending] = useState<RegularisationRequest[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { from, to } = monthRange();
    try {
      const rows = await att.listAttendance(from, to);
      setRecords(rows);
      if (hasRole('MANAGER')) {
        setPending(await att.listPendingRegularisations());
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load attendance');
    }
  }, [hasRole]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  // Check in with browser geolocation (for geo-fencing); falls back if unavailable.
  function checkInWithLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      void act(() => att.checkIn(), 'Checked in');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        act(
          () => att.checkIn({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          'Checked in',
        ),
      () => act(() => att.checkIn(), 'Checked in (location unavailable)'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => r.date.slice(0, 10) === today);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <Card>
        <CardTitle>Today</CardTitle>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">
            {todayRecord?.checkInAt
              ? `Checked in at ${new Date(todayRecord.checkInAt).toLocaleTimeString()}`
              : 'Not checked in'}
            {todayRecord?.checkOutAt
              ? ` · Checked out at ${new Date(todayRecord.checkOutAt).toLocaleTimeString()}`
              : ''}
            {todayRecord && todayRecord.withinGeofence != null ? (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  todayRecord.withinGeofence
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {todayRecord.withinGeofence ? '📍 within office' : '⚠ outside geofence'}
              </span>
            ) : null}
          </div>
          <div className="ml-auto flex gap-2">
            <Button disabled={busy || !!todayRecord?.checkInAt} onClick={checkInWithLocation}>
              Check in
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !todayRecord?.checkInAt || !!todayRecord?.checkOutAt}
              onClick={() => act(() => att.checkOut(), 'Checked out')}
            >
              Check out
            </Button>
          </div>
        </div>
      </Card>

      {hasRole('MANAGER') && pending.length > 0 ? (
        <Card>
          <CardTitle>Pending regularisations</CardTitle>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-slate-100 p-3 text-sm">
                <span className="text-slate-700">
                  {r.requestedStatus} · {r.reason}
                </span>
                <div className="flex gap-2">
                  <Button onClick={() => act(() => att.decideRegularisation(r.id, 'APPROVE'), 'Approved')}>
                    Approve
                  </Button>
                  <Button variant="danger" onClick={() => act(() => att.decideRegularisation(r.id, 'REJECT'), 'Rejected')}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="p-6 pb-0">
          <CardTitle>This month</CardTitle>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">In</th>
              <th className="px-4 py-3 font-medium">Out</th>
              <th className="px-4 py-3 font-medium">Hours</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No attendance records this month.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{r.date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.status}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {(r.workedMinutes / 60).toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
