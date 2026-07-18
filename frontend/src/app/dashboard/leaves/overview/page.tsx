'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getBalances, listLeaveRequests, listLeaveTypes } from '@/lib/api/leaves';
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const last = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  while (d.getTime() <= last.getTime()) {
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export default function LeaveOverviewPage() {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, t, r] = await Promise.all([
          getBalances(year).catch(() => [] as LeaveBalance[]),
          listLeaveTypes().catch(() => [] as LeaveType[]),
          listLeaveRequests().catch(() => [] as LeaveRequest[]),
        ]);
        setBalances(b);
        setTypes(t);
        setRequests(r);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load leave data');
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const typeName = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types]);

  // Build a per-day status map for the selected year.
  const dayStatus = useMemo(() => {
    const map = new Map<string, 'APPROVED' | 'PENDING'>();
    for (const req of requests) {
      if (req.status !== 'APPROVED' && req.status !== 'PENDING') continue;
      for (const key of eachDay(req.startDate, req.endDate)) {
        if (!key.startsWith(String(year))) continue;
        if (req.status === 'APPROVED' || !map.has(key)) {
          map.set(key, req.status === 'APPROVED' ? 'APPROVED' : 'PENDING');
        }
      }
    }
    return map;
  }, [requests, year]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = requests
    .filter((r) => r.endDate >= todayKey && (r.status === 'APPROVED' || r.status === 'PENDING'))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const finished = requests
    .filter((r) => r.endDate < todayKey)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave overview</h1>
        <Link
          href="/dashboard/leaves"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          📅 New absence
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : balances.length === 0 ? (
          <Card className="col-span-full">
            <p className="text-sm text-slate-400">
              No leave balances yet. HR can set up leave types and policies under Holidays &amp; Policies.
            </p>
          </Card>
        ) : (
          balances.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {typeName.get(b.leaveTypeId) ?? 'Leave'}
              </p>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-400">Balance</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{b.available} <span className="text-sm font-normal text-slate-400">days</span></p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* Left: lists */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Upcoming absences</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">No absences</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 p-2 text-sm dark:border-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{typeName.get(r.leaveTypeId) ?? 'Leave'}</span>
                    <span className="block text-xs text-slate-500">
                      {r.startDate} – {r.endDate} · {r.days} day{r.days > 1 ? 's' : ''} · {r.status.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Already finished absences</h2>
            {finished.length === 0 ? (
              <p className="text-sm text-slate-400">No absences</p>
            ) : (
              <ul className="space-y-2">
                {finished.slice(0, 8).map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 p-2 text-sm dark:border-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{typeName.get(r.leaveTypeId) ?? 'Leave'}</span>
                    <span className="block text-xs text-slate-500">
                      {r.startDate} – {r.endDate} · {r.days} day{r.days > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right: year calendar */}
        <Card>
          <div className="mb-3 flex items-center justify-center gap-4">
            <button onClick={() => setYear((y) => y - 1)} className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">‹</button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{year}</span>
            <button onClick={() => setYear((y) => y + 1)} className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">›</button>
          </div>

          <div className="mb-4 flex justify-center gap-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Approved</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pending approval</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MONTHS.map((m, mi) => (
              <MonthCal key={m} year={year} month={mi} title={m} dayStatus={dayStatus} todayKey={todayKey} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MonthCal({
  year,
  month,
  title,
  dayStatus,
  todayKey,
}: {
  year: number;
  month: number;
  title: string;
  dayStatus: Map<string, 'APPROVED' | 'PENDING'>;
  todayKey: string;
}) {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-slate-400">
        {WD.map((d) => (
          <span key={d} className="py-0.5">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const status = dayStatus.get(key);
          const isToday = key === todayKey;
          return (
            <span
              key={key}
              className={[
                'flex h-5 items-center justify-center rounded text-[10px]',
                status === 'APPROVED' ? 'bg-brand-600 font-semibold text-white' : '',
                status === 'PENDING' ? 'bg-amber-400 font-semibold text-white' : '',
                !status && isToday ? 'ring-1 ring-brand-400 text-slate-700 dark:text-slate-200' : '',
                !status && !isToday ? 'text-slate-600 dark:text-slate-300' : '',
              ].join(' ')}
              title={status ? `${key}: ${status.toLowerCase()}` : key}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
