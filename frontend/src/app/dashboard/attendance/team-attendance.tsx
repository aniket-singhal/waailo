'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getReport, listPendingRegularisations, decideRegularisation } from '@/lib/api/attendance';
import type { AttendanceReport, DayStatus, RegularisationRequest } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Short code + colour per status, matching a Zoho-style muster roll.
const STATUS: Record<DayStatus, { code: string; cls: string; label: string }> = {
  PRESENT: { code: 'P', cls: 'bg-green-100 text-green-700', label: 'Present' },
  HALF_DAY: { code: 'HD', cls: 'bg-lime-100 text-lime-700', label: 'Half day' },
  ABSENT: { code: 'A', cls: 'bg-red-100 text-red-700', label: 'Absent' },
  ON_LEAVE: { code: 'L', cls: 'bg-blue-100 text-blue-700', label: 'On leave' },
  HOLIDAY: { code: 'H', cls: 'bg-purple-100 text-purple-700', label: 'Holiday' },
  WEEKEND: { code: 'W', cls: 'bg-slate-100 text-slate-500', label: 'Weekend' },
  NONE: { code: '·', cls: 'text-slate-300', label: '—' },
};

export function TeamAttendance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [tab, setTab] = useState<'muster' | 'summary'>('muster');
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [pending, setPending] = useState<RegularisationRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rep, pend] = await Promise.all([
        getReport(month, year),
        listPendingRegularisations().catch(() => [] as RegularisationRequest[]),
      ]);
      setReport(rep);
      setPending(pend);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  async function decide(id: string, decision: 'APPROVE' | 'REJECT') {
    setMsg(null);
    try {
      await decideRegularisation(id, decision);
      setMsg(decision === 'APPROVE' ? 'Regularisation approved' : 'Regularisation rejected');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  function shift(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setMonth(d.getUTCMonth() + 1);
    setYear(d.getUTCFullYear());
  }

  const dayNums = report ? Array.from({ length: report.daysInMonth }, (_, i) => i + 1) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded-md border border-slate-200 px-2 py-1 text-sm hover:bg-slate-100">←</button>
          <span className="min-w-[120px] text-center text-sm font-medium text-slate-700">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={() => shift(1)} className="rounded-md border border-slate-200 px-2 py-1 text-sm hover:bg-slate-100">→</button>
        </div>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === 'muster'} onClick={() => setTab('muster')}>Muster Roll</TabButton>
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>Summary</TabButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      {pending.length > 0 ? (
        <Card>
          <CardTitle>Pending regularisations</CardTitle>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-slate-100 p-3 text-sm">
                <span className="text-slate-700">
                  {r.requestedStatus} · {r.reason}
                </span>
                <div className="flex gap-2">
                  <Button onClick={() => decide(r.id, 'APPROVE')}>Approve</Button>
                  <Button variant="danger" onClick={() => decide(r.id, 'REJECT')}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {loading ? (
        <Card><p className="text-sm text-slate-400">Loading…</p></Card>
      ) : !report || report.rows.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No active employees with attendance for this period.</p></Card>
      ) : tab === 'muster' ? (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full border-collapse text-center text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-500">Employee</th>
                {dayNums.map((d) => (
                  <th key={d} className="px-1 py-2 font-medium text-slate-400">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.employeeId} className="border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left">
                    <span className="font-medium text-slate-800">{r.employeeName}</span>{' '}
                    <span className="font-mono text-[10px] text-slate-400">{r.employeeCode}</span>
                  </td>
                  {r.days.map((day) => {
                    const s = STATUS[day.status];
                    return (
                      <td key={day.date} className="px-1 py-1">
                        <span
                          title={`${day.date}: ${s.label}`}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold ${s.cls}`}
                        >
                          {s.code}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Present</th>
                <th className="px-4 py-3 font-medium">Half-day</th>
                <th className="px-4 py-3 font-medium">On leave</th>
                <th className="px-4 py-3 font-medium">Absent</th>
                <th className="px-4 py-3 font-medium">Holidays</th>
                <th className="px-4 py-3 font-medium">Weekends</th>
                <th className="px-4 py-3 font-medium">Payable days</th>
                <th className="px-4 py-3 font-medium">Worked hrs</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.employeeId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">
                    {r.employeeName} <span className="font-mono text-xs text-slate-400">{r.employeeCode}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.counts.present}</td>
                  <td className="px-4 py-3 text-slate-700">{r.counts.halfDay}</td>
                  <td className="px-4 py-3 text-slate-700">{r.counts.onLeave}</td>
                  <td className="px-4 py-3 text-slate-700">{r.counts.absent}</td>
                  <td className="px-4 py-3 text-slate-700">{r.counts.holiday}</td>
                  <td className="px-4 py-3 text-slate-700">{r.counts.weekend}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.payableDays}</td>
                  <td className="px-4 py-3 text-slate-700">{r.workedHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardTitle>Legend</CardTitle>
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.keys(STATUS) as DayStatus[])
            .filter((k) => k !== 'NONE')
            .map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${STATUS[k].cls}`}>
                  {STATUS[k].code}
                </span>
                {STATUS[k].label}
              </span>
            ))}
        </div>
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium ${
        active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
