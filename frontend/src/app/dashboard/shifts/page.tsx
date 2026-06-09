'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as shiftsApi from '@/lib/api/shifts';
import { listEmployees } from '@/lib/api/employees';
import type { Employee, Shift, ShiftAssignment } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';

const WEEKDAYS: { n: number; label: string }[] = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 7, label: 'Sun' },
];

/** "1,2,3,4,5" → "Mon, Tue, Wed, Thu, Fri" */
function formatDays(days: string): string {
  const map: Record<string, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
  return days
    .split(',')
    .map((d) => map[d.trim()] ?? d.trim())
    .filter(Boolean)
    .join(', ');
}

export default function ShiftsPage() {
  const { hasRole } = useAuth();
  const isHr = hasRole('HR_ADMIN');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myShift, setMyShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
    const [s, mine] = await Promise.all([safe(shiftsApi.listShifts()), safe(shiftsApi.myShift())]);
    if (s) setShifts(s);
    if (mine) setMyShift(mine.shift);
    if (isHr) {
      const [a, e] = await Promise.all([
        safe(shiftsApi.listAssignments()),
        safe(listEmployees({ pageSize: 100 })),
      ]);
      if (a) setAssignments(a);
      if (e) setEmployees(e.data);
    }
  }, [isHr]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName} (${e.employeeCode})` : id;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Shift Planning</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <Card>
        <CardTitle>My current shift</CardTitle>
        {myShift ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">{myShift.name}</span> · {myShift.startTime}–{myShift.endTime} ·{' '}
            {formatDays(myShift.workingDays)}
          </p>
        ) : (
          <p className="text-sm text-slate-400">No shift assigned to you yet.</p>
        )}
      </Card>

      {isHr ? <NewShift onCreated={load} /> : null}

      <Card className="p-0">
        <div className="p-6 pb-0">
          <CardTitle>Shifts</CardTitle>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Working days</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No shifts defined yet.
                </td>
              </tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.startTime}–{s.endTime}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDays(s.workingDays)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {isHr ? (
        <AssignShift shifts={shifts} employees={employees} assignments={assignments} empName={empName} onAct={act} />
      ) : null}
    </div>
  );
}

function NewShift({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleDay(n: number) {
    setDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (days.length === 0) {
      setErr('Select at least one working day');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await shiftsApi.createShift({
        name,
        startTime: start,
        endTime: end,
        workingDays: days.join(','),
      });
      setName('');
      setDays([1, 2, 3, 4, 5]);
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to create shift');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Create a shift (HR)</CardTitle>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="sn">
            <Input id="sn" value={name} onChange={(e) => setName(e.target.value)} placeholder="General" required />
          </Field>
          <Field label="Start" htmlFor="ss">
            <Input id="ss" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </Field>
          <Field label="End" htmlFor="se">
            <Input id="se" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </Field>
        </div>
        <div>
          <p className="mb-1 block text-sm font-medium text-slate-700">Working days</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <button
                key={d.n}
                type="button"
                onClick={() => toggleDay(d.n)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                  days.includes(d.n)
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create shift'}
        </Button>
      </form>
    </Card>
  );
}

function AssignShift({
  shifts,
  employees,
  assignments,
  empName,
  onAct,
}: {
  shifts: Shift[];
  employees: Employee[];
  assignments: ShiftAssignment[];
  empName: (id: string) => string;
  onAct: (fn: () => Promise<unknown>, s: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [from, setFrom] = useState('');
  const shiftName = (id: string) => shifts.find((s) => s.id === id)?.name ?? id;

  return (
    <Card>
      <CardTitle>Assign a shift (HR)</CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!employeeId || !shiftId || !from) return;
          onAct(() => shiftsApi.assignShift({ employeeId, shiftId, effectiveFrom: from }), 'Shift assigned');
          setEmployeeId('');
        }}
        className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4"
      >
        <Field label="Employee" htmlFor="ae">
          <select
            id="ae"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            required
          >
            <option value="">Select employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.employeeCode})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shift" htmlFor="ash">
          <select
            id="ash"
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            required
          >
            <option value="">Select shift…</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effective from" htmlFor="af">
          <Input id="af" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Assign</Button>
        </div>
      </form>
      <div className="space-y-1 text-sm">
        {assignments.length === 0 ? (
          <p className="text-slate-400">No assignments yet.</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
              <span className="text-slate-700">{empName(a.employeeId)}</span>
              <span className="text-slate-600">{shiftName(a.shiftId)}</span>
              <span className="text-slate-400">from {a.effectiveFrom.slice(0, 10)}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
