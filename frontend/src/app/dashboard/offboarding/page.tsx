'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getExit,
  initiateExit,
  listExits,
  toggleExitTask,
  updateExitStatus,
} from '@/lib/api/offboarding';
import { listEmployees } from '@/lib/api/employees';
import type { Employee, ExitRecord, ExitStatus, ExitType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const TYPES: ExitType[] = ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT', 'OTHER'];

const STATUS_STYLE: Record<ExitStatus, string> = {
  INITIATED: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export default function OffboardingPage() {
  const [exits, setExits] = useState<ExitRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [detail, setDetail] = useState<ExitRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // form state
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<ExitType>('RESIGNATION');
  const [reason, setReason] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ex, emps] = await Promise.all([
        listExits(),
        listEmployees({ pageSize: 200, status: 'ACTIVE' }),
      ]);
      setExits(ex);
      setEmployees(emps.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!employeeId || !noticeDate || !lastWorkingDay) {
      setError('Employee, notice date and last working day are required');
      return;
    }
    try {
      await initiateExit({ employeeId, type, reason: reason || undefined, noticeDate, lastWorkingDay });
      setMsg('Offboarding initiated');
      setEmployeeId('');
      setReason('');
      setNoticeDate('');
      setLastWorkingDay('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to initiate');
    }
  }

  async function openDetail(id: string) {
    setDetail(await getExit(id));
  }

  async function setStatus(id: string, status: ExitStatus) {
    setMsg(null);
    try {
      await updateExitStatus(id, { status });
      setMsg(`Marked ${status.toLowerCase().replace('_', ' ')}`);
      await load();
      if (detail?.id === id) await openDetail(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  async function toggle(taskId: string, done: boolean) {
    await toggleExitTask(taskId, done);
    if (detail) await openDetail(detail.id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Offboarding</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <Card>
        <CardTitle>Initiate offboarding</CardTitle>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Employee</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Exit type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ExitType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Notice date</span>
            <input
              type="date"
              value={noticeDate}
              onChange={(e) => setNoticeDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last working day</span>
            <input
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Reason (optional)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Initiate offboarding</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Last working day</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : exits.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-400">No offboarding records yet.</td></tr>
            ) : (
              exits.map((x) => (
                <tr key={x.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">
                    {x.employeeName} <span className="font-mono text-xs text-slate-400">{x.employeeCode}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{x.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-700">{x.lastWorkingDay?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[x.status]}`}>
                      {x.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => openDetail(x.id)}>Manage</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {detail ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>
              {detail.employeeName} — clearance checklist
            </CardTitle>
            <button onClick={() => setDetail(null)} className="text-sm text-slate-400 hover:text-slate-600">Close ✕</button>
          </div>
          <div className="space-y-2">
            {(detail.tasks ?? []).map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => toggle(t.id, e.target.checked)}
                  disabled={detail.status === 'COMPLETED' || detail.status === 'CANCELLED'}
                />
                <span className={t.done ? 'line-through text-slate-400' : ''}>{t.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.status === 'INITIATED' ? (
              <Button onClick={() => setStatus(detail.id, 'IN_PROGRESS')}>Start clearance</Button>
            ) : null}
            {(detail.status === 'INITIATED' || detail.status === 'IN_PROGRESS') ? (
              <>
                <Button onClick={() => setStatus(detail.id, 'COMPLETED')}>Complete exit</Button>
                <Button variant="danger" onClick={() => setStatus(detail.id, 'CANCELLED')}>Cancel</Button>
              </>
            ) : (
              <span className="text-sm text-slate-500">This exit is {detail.status.toLowerCase()}.</span>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
