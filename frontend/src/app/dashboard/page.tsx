'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';
import { listEmployees } from '@/lib/api/employees';
import { getCompany } from '@/lib/api/company';
import { listLeaveRequests } from '@/lib/api/leaves';
import { listDocuments } from '@/lib/api/documents';
import { listNotifications } from '@/lib/api/notifications';
import type { Company, NotificationItem } from '@/lib/api/types';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const isHr = hasRole('HR_ADMIN');
  const [company, setCompany] = useState<Company | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [leavePending, setLeavePending] = useState<number | null>(null);
  const [docs, setDocs] = useState<number | null>(null);
  const [activity, setActivity] = useState<NotificationItem[]>([]);

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
  }, [isHr]);

  const quickActions = isHr
    ? [
        { label: 'Add Employee', href: '/dashboard/employees/invite', icon: '➕' },
        { label: 'Run Payroll', href: '/dashboard/payroll', icon: '💸' },
        { label: 'Add Holiday', href: '/dashboard/holidays', icon: '📅' },
        { label: 'Upload Document', href: '/dashboard/documents', icon: '📄' },
        { label: 'Company Setup', href: '/dashboard/company', icon: '⚙️' },
      ]
    : [
        { label: 'Apply Leave', href: '/dashboard/leaves', icon: '🏖️' },
        { label: 'Attendance', href: '/dashboard/attendance', icon: '🕐' },
        { label: 'My Payslips', href: '/dashboard/payroll', icon: '💸' },
        { label: 'Documents', href: '/dashboard/documents', icon: '📄' },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{company?.name ?? 'Dashboard'}</h1>
        <p className="text-sm text-slate-500">Signed in as {user?.email}</p>
      </div>

      {/* Quick actions */}
      <Card>
        <CardTitle>Quick Actions</CardTitle>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="text-2xl">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total employees" value={headcount} />
        <Stat label="Active employees" value={active} />
        <Stat label="Leave requests pending" value={leavePending} />
        <Stat label="Documents" value={docs} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: charts + activity */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>Headcount trend</CardTitle>
            <LineChart values={[2, 3, 3, 4, 5, 5, 6, headcount ?? 6]} />
            <p className="mt-2 text-xs text-slate-400">Illustrative trend — historical tracking lands with analytics.</p>
          </Card>

          <Card>
            <CardTitle>Attendance snapshot</CardTitle>
            <BarChart values={[82, 50, 64, 95, 50, 88, 25]} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
            <p className="mt-2 text-xs text-slate-400">Illustrative weekly attendance %.</p>
          </Card>

          {isHr ? (
            <Card>
              <CardTitle>Recent activity</CardTitle>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-400">No recent notifications.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activity.map((n) => (
                    <li key={n.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <span className="text-slate-700">
                        {n.eventKey} → {n.recipient}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>

        {/* Right: progress widgets */}
        <div className="space-y-6">
          <Card>
            <CardTitle>Pending actions</CardTitle>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center justify-between">
                <span>Leave approvals</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {leavePending ?? 0}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Documents to review</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {docs ?? 0}
                </span>
              </li>
            </ul>
          </Card>

          <Card>
            <CardTitle>Setup checklist</CardTitle>
            <ul className="space-y-2 text-sm">
              <Check done label="Create your company" />
              <Check done={(headcount ?? 0) > 0} label="Invite employees" />
              <Check done={(active ?? 0) > 0} label="Activate an employee" />
              <Check label="Configure leave policies" />
              <Check label="Run first payroll" />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value ?? '—'}</p>
    </Card>
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
      <span className={done ? 'text-slate-400 line-through' : 'text-slate-700'}>{label}</span>
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
      <polyline
        fill="none"
        stroke="#1f5a8f"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * (h - 20) - 10} r="2.5" fill="#1f5a8f" />
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
          <div
            className="w-full rounded-t bg-brand-500"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${v}%`}
          />
          <span className="text-[10px] text-slate-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
