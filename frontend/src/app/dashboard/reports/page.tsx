'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { getOverview } from '@/lib/api/reports';
import type { LabelCount, ReportsOverview } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

function rupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    paise / 100,
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsPage() {
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await getOverview());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Card><p className="text-sm text-slate-400">Loading analytics…</p></Card>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const h = data.headline;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Reporting &amp; Analytics</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active headcount" value={h.activeHeadcount} />
        <Stat label="On notice" value={h.onNotice} />
        <Stat label="New joiners (YTD)" value={h.newJoinersThisYear} />
        <Stat label="Exits (YTD)" value={h.exitedThisYear} />
        <Stat label="Attrition rate" value={`${h.attritionRate}%`} />
        <Stat label="Pending leaves" value={h.pendingLeaves} />
        <Stat label="Open jobs" value={h.openJobs} />
        <Stat
          label="Last payroll (net)"
          value={data.latestPayroll ? rupees(data.latestPayroll.totalNet) : '—'}
          sub={data.latestPayroll ? `${MONTHS[data.latestPayroll.periodMonth - 1]} ${data.latestPayroll.periodYear}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Headcount by department</CardTitle>
          <BarList items={data.headcountByDepartment} color="bg-brand-600" />
        </Card>
        <Card>
          <CardTitle>Headcount by employment type</CardTitle>
          <BarList items={data.headcountByType.map((t) => ({ ...t, label: t.label.replace(/_/g, ' ') }))} color="bg-emerald-500" />
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>Recruitment pipeline</CardTitle>
          <BarList items={data.candidatesByStage} color="bg-violet-500" />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="text-xs text-slate-400">{sub}</div> : null}
    </Card>
  );
}

function BarList({ items, color }: { items: LabelCount[]; color: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-slate-600" title={i.label}>{i.label}</span>
          <div className="h-5 flex-1 rounded bg-slate-100">
            <div className={`h-5 rounded ${color}`} style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right font-medium text-slate-700">{i.count}</span>
        </div>
      ))}
    </div>
  );
}
