'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { listEmployees } from '@/lib/api/employees';
import { getCompany } from '@/lib/api/company';
import { listLeaveRequests } from '@/lib/api/leaves';
import { listDocuments } from '@/lib/api/documents';
import { listNotifications } from '@/lib/api/notifications';
import { checkIn, checkOut, listAttendance } from '@/lib/api/attendance';
import type { AttendanceRecord, Company, NotificationItem } from '@/lib/api/types';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function fmtHm(mins: number) {
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Working late';
}

function greetingEmoji(): string {
  const h = new Date().getHours();
  if (h < 12) return '🌅';
  if (h < 17) return '☀️';
  return '🌙';
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const isHr = hasRole('HR_ADMIN');
  const [company, setCompany] = useState<Company | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [leavePending, setLeavePending] = useState<number | null>(null);
  const [docs, setDocs] = useState<number | null>(null);
  const [activity, setActivity] = useState<NotificationItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [attRecords, setAttRecords] = useState<AttendanceRecord[] | null>(null);
  const [clocking, setClocking] = useState(false);
  const [attMsg, setAttMsg] = useState<string | null>(null);

  const loadAttendance = async () => {
    const d = new Date();
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const to = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())}`;
    const recs = await listAttendance(from, to).catch(() => null);
    setAttRecords(recs);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
      const [c, all, act, lv, dc] = await Promise.all([
        safe(getCompany()),
        safe(listEmployees({ pageSize: 1 })),
        safe(listEmployees({ pageSize: 1, status: 'ACTIVE' })),
        safe(listLeaveRequests('PENDING')),
        safe(listDocuments(1, 1)),
      ]);
      if (c) setCompany(c);
      if (all) setHeadcount(all.meta.total);
      if (act) setActive(act.meta.total);
      if (lv) setLeavePending(lv.length);
      if (dc) setDocs(dc.meta.total);
      if (isHr) {
        const n = await safe(listNotifications(1, 6));
        if (n) setActivity(n.data);
      }
    })();
    void loadAttendance();
  }, [isHr]);

  // Attendance derived values
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthDate = new Date();
  const todayRec = attRecords?.find((r) => r.date.slice(0, 10) === todayKey);
  const workedToday = todayRec?.workedMinutes ?? 0;
  const workedMonth = (attRecords ?? []).reduce((a, r) => a + r.workedMinutes, 0);
  const workingDays = Array.from(
    { length: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate() },
    (_, i) => new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1).getDay(),
  ).filter((d) => d !== 0 && d !== 6).length;
  const monthGoal = workingDays * 480;
  const monthBalance = workedMonth - monthGoal;
  const openNow = Boolean(todayRec?.checkInAt && !todayRec?.checkOutAt);

  async function clock() {
    setClocking(true);
    setAttMsg(null);
    try {
      if (openNow) await checkOut();
      else await checkIn();
      await loadAttendance();
    } catch {
      setAttMsg('Clock-in is available to employee accounts.');
    } finally {
      setClocking(false);
    }
  }

  const name = (user?.email ?? 'there').split('@')[0].replace(/[^a-zA-Z]/g, '') || 'there';
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  const quickActions = isHr
    ? [
        { label: 'Add employee', href: '/dashboard/employees/invite', icon: '➕' },
        { label: 'Run payroll', href: '/dashboard/payroll', icon: '💸' },
        { label: 'Review onboarding', href: '/dashboard/onboarding', icon: '📋' },
        { label: 'New activity', href: '/dashboard/attendance', icon: '📖' },
      ]
    : [
        { label: 'Clock-in', href: '/dashboard/attendance', icon: '🏃' },
        { label: 'Apply leave', href: '/dashboard/leaves', icon: '🏖️' },
        { label: 'My payslips', href: '/dashboard/payroll', icon: '💸' },
        { label: 'My onboarding', href: '/dashboard/my-onboarding', icon: '📋' },
      ];

  const tasks: { label: string; href: string; count: number }[] = [];
  if (isHr && (leavePending ?? 0) > 0)
    tasks.push({ label: 'Leave requests to approve', href: '/dashboard/leaves', count: leavePending ?? 0 });

  return (
    <div className="space-y-5">
      {/* Greeting + quick actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {greeting()}, {displayName} {greetingEmoji()}
          </h1>
          <p className="text-sm text-slate-500">
            {company?.name ? `${company.name} · ` : ''}
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Attendance quick overview */}
      <Panel title="Quick overview">
        <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-48">
            <span className="text-base font-semibold text-brand-700 dark:text-brand-300">Attendance</span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                openNow ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {openNow ? '● At work' : '○ Off work'}
            </span>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric label="Today" value={`${fmtHm(workedToday)} / ${fmtHm(480)}`} />
            <Metric label="Total monthly balance" value={`${fmtHm(workedMonth)} / ${fmtHm(monthGoal)}`} />
            <Metric
              label="Month-to-date balance"
              value={`${monthBalance >= 0 ? '+' : '-'}${fmtHm(Math.abs(monthBalance))}`}
              valueClass={monthBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
          </div>

          <button
            onClick={clock}
            disabled={clocking}
            className="shrink-0 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:bg-slate-900 dark:text-brand-300"
          >
            {clocking ? '…' : openNow ? '⏹ Clock out' : '🏃 Clock in'}
          </button>
        </div>
        {attMsg ? <p className="mt-2 text-xs text-slate-400">{attMsg}</p> : null}
      </Panel>

      {/* Tasks to complete */}
      <Panel title="Tasks to complete">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No tasks 👍</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((t) => (
              <li key={t.label} className="flex items-center justify-between py-3">
                <Link href={t.href} className="text-sm font-medium text-slate-700 hover:text-brand-700 dark:text-slate-200">
                  {t.label}
                </Link>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Overview stats */}
      <Panel title="Overview">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total employees" value={headcount} />
          <Stat label="Active employees" value={active} />
          <Stat label="Leave pending" value={leavePending} />
          <Stat label="Documents" value={docs} />
        </div>
      </Panel>

      {/* Attendance & headcount */}
      <Panel title="Attendance & headcount">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Inner title="Headcount trend">
            <LineChart values={[2, 3, 3, 4, 5, 5, 6, headcount ?? 6]} />
            <p className="mt-2 text-xs text-slate-400">Illustrative — historical tracking lands with analytics.</p>
          </Inner>
          <Inner title="Weekly attendance">
            <BarChart values={[82, 50, 64, 95, 50, 88, 25]} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
            <p className="mt-2 text-xs text-slate-400">Illustrative weekly attendance %.</p>
          </Inner>
        </div>
      </Panel>

      {/* Activity & checklist */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isHr ? (
          <Panel title="Recent activity">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">No recent notifications.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((n) => (
                  <li key={n.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-200">{n.eventKey.replace(/[._]/g, ' ')}</span>
                    <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        <Panel title="Setup checklist">
          <ul className="space-y-2 text-sm">
            <Check done label="Create your company" />
            <Check done={(headcount ?? 0) > 0} label="Invite employees" />
            <Check done={(active ?? 0) > 0} label="Activate an employee" />
            <Check label="Configure leave policies" />
            <Check label="Run first payroll" />
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Inner({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
      <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold text-slate-900 dark:text-white ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{value ?? '—'}</p>
    </div>
  );
}

function Check({ label, done }: { label: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
          done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'
        }`}
      >
        ✓
      </span>
      <span className={done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}>{label}</span>
    </li>
  );
}

function LineChart({ values }: { values: number[] }) {
  const w = 520;
  const h = 120;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * (h - 20) - 10}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
      <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts.join(' ')} />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * (h - 20) - 10} r="2.5" fill="#4f46e5" />
      ))}
    </svg>
  );
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t bg-brand-500" style={{ height: `${(v / max) * 100}%` }} title={`${v}%`} />
          <span className="text-[10px] text-slate-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
