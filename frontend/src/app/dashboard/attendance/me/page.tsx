'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { checkIn, checkOut, listAttendance, monthlySummary } from '@/lib/api/attendance';
import type { AttendanceRecord, AttendanceSummary } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function fmt(mins: number) {
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`;
}
function localFrac(iso: string): number {
  const d = new Date(iso);
  return (d.getHours() * 60 + d.getMinutes()) / 1440;
}

export default function MyAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${pad(month)}-01`;
    const to = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
    try {
      const [recs, sum] = await Promise.all([
        listAttendance(from, to).catch(() => [] as AttendanceRecord[]),
        monthlySummary(month, year).catch(() => null),
      ]);
      setRecords(recs);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    for (const r of records) m.set(r.date.slice(0, 10), r);
    return m;
  }, [records]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = new Date().toISOString().slice(0, 10);

  const totalWorked = records.reduce((a, r) => a + r.workedMinutes, 0);
  const todayRec = byDate.get(todayKey);
  const workingDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1).getDay())
    .filter((d) => d !== 0 && d !== 6).length;
  const monthlyGoal = workingDays * 480; // 8h/working day
  const balance = totalWorked - monthlyGoal;

  const openNow = todayRec?.checkInAt && !todayRec?.checkOutAt;

  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }
  function goToday() {
    const d = new Date();
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }

  async function clock() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      if (openNow) {
        await checkOut();
        setMsg('Clocked out.');
      } else {
        await checkIn();
        setMsg('Clocked in.');
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Clock action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
        <Button onClick={clock} disabled={busy}>
          {busy ? '…' : openNow ? '⏹ Clock out' : '🏃 Clock in'}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Timeline */}
        <Card className="p-0">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <button onClick={() => shift(-1)} className="rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">‹</button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={() => shift(1)} className="rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">›</button>
            <button onClick={goToday} className="text-sm font-medium text-brand-600 hover:underline">Today</button>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {loading ? (
              <p className="p-6 text-sm text-slate-400">Loading…</p>
            ) : (
              Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dObj = new Date(year, month - 1, day);
                const key = `${year}-${pad(month)}-${pad(day)}`;
                const rec = byDate.get(key);
                const isToday = key === todayKey;
                const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

                let startF = 0;
                let endF = 0;
                if (rec?.checkInAt) {
                  startF = localFrac(rec.checkInAt);
                  endF = rec.checkOutAt ? localFrac(rec.checkOutAt) : (isToday ? localFrac(new Date().toISOString()) : startF + rec.workedMinutes / 1440);
                }
                const hasSeg = endF > startF;

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 px-4 py-1.5 ${isToday ? 'bg-brand-50/60 dark:bg-brand-900/20' : ''}`}
                  >
                    <span className={`w-24 shrink-0 text-xs ${isWeekend ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {day}/{month}/{String(year).slice(2)} ({WD[dObj.getDay()]})
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      {/* hour gridlines */}
                      {[0.25, 0.5, 0.75].map((f) => (
                        <span key={f} className="absolute top-0 h-full w-px bg-slate-200 dark:bg-slate-700" style={{ left: `${f * 100}%` }} />
                      ))}
                      {hasSeg ? (
                        <span
                          className="absolute top-0 h-full rounded bg-emerald-500"
                          style={{ left: `${startF * 100}%`, width: `${(endF - startF) * 100}%` }}
                        />
                      ) : null}
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-700 dark:text-slate-200">
                      {rec ? fmt(rec.workedMinutes) : '0:00'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right summary */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Today · {todayKey.slice(8)}/{todayKey.slice(5, 7)}
            </h2>
            <Row label="Total worked" value={fmt(todayRec?.workedMinutes ?? 0)} />
            <Row label="Status" value={todayRec?.status?.replace(/_/g, ' ') ?? '—'} />
            <Row label="Check-in" value={todayRec?.checkInAt ? new Date(todayRec.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
            <Row label="Check-out" value={todayRec?.checkOutAt ? new Date(todayRec.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{MONTHS[month - 1]} {year}</h2>
            <Row label="Monthly goal" value={fmt(monthlyGoal)} />
            <Row label="Total worked" value={fmt(totalWorked)} />
            <Row
              label="Balance"
              value={`${balance >= 0 ? '+' : ''}${fmt(Math.abs(balance))}`}
              valueClass={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
            <Row label="Days present" value={String(summary?.summary?.PRESENT ?? 0)} />
            <Row label="Paid days" value={String(summary?.paidDays ?? 0)} />
          </Card>

          <p className="text-center text-xs text-slate-400">Timeline spans 00:00–24:00; the green bar is worked time.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium text-slate-800 dark:text-slate-100 ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
