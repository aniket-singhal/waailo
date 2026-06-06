'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as payrollApi from '@/lib/api/payroll';
import type { PayrollRun, Payslip } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { formatINR, monthName } from '@/lib/utils/money';
import { useAuth } from '@/lib/auth/auth-context';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function PayrollPage() {
  const { hasRole } = useAuth();
  return hasRole('HR_ADMIN') ? <PayrollAdmin /> : <MyPayslips />;
}

// ---------------- HR / Admin ----------------
function PayrollAdmin() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selected, setSelected] = useState<Payslip | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const load = useCallback(async () => {
    setError(null);
    try {
      setRuns(await payrollApi.listRuns());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payroll runs');
    }
  }, []);

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

  async function viewPayslips(runId: string) {
    setSelected(null);
    if (openRun === runId) {
      setOpenRun(null);
      return;
    }
    try {
      setPayslips(await payrollApi.listRunPayslips(runId));
      setOpenRun(runId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payslips');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <Card>
        <CardTitle>Run payroll for a period</CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Month" htmlFor="m">
            <select
              id="m"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {monthName(i + 1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" htmlFor="y">
            <Input id="y" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
          </Field>
          <Button
            disabled={busy}
            onClick={() => act(() => payrollApi.createRun(Number(month), Number(year)), 'Run created')}
          >
            Create run
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="p-6 pb-0">
          <CardTitle>Runs</CardTitle>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total gross</th>
              <th className="px-4 py-3 font-medium">Total net</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No payroll runs yet.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">
                    {monthName(r.periodMonth)} {r.periodYear}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatINR(r.totalGross)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatINR(r.totalNet)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {r.status !== 'PAID' ? (
                        <Button variant="secondary" disabled={busy} onClick={() => act(() => payrollApi.processRun(r.id), 'Run processed')}>
                          {r.status === 'COMPLETED' ? 'Re-process' : 'Process'}
                        </Button>
                      ) : null}
                      {r.status === 'COMPLETED' ? (
                        <Button disabled={busy} onClick={() => act(() => payrollApi.markPaid(r.id), 'Marked paid')}>
                          Mark paid
                        </Button>
                      ) : null}
                      <Button variant="ghost" onClick={() => viewPayslips(r.id)}>
                        {openRun === r.id ? 'Hide payslips' : 'View payslips'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {openRun ? (
        <Card className="p-0">
          <div className="p-6 pb-0">
            <CardTitle>Payslips</CardTitle>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Deductions</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No payslips — make sure employees have a salary structure, then process the run.
                  </td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">
                      {p.employeeName} <span className="font-mono text-xs text-slate-400">{p.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatINR(p.gross)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatINR(p.totalDeductions)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatINR(p.net)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" onClick={() => setSelected(p)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      ) : null}

      {selected ? <PayslipDetail payslip={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

// ---------------- Employee ----------------
function MyPayslips() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Payslip | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPayslips(await payrollApi.myPayslips());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load payslips');
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My payslips</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Deductions</th>
              <th className="px-4 py-3 font-medium">Net pay</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {payslips.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No payslips yet.
                </td>
              </tr>
            ) : (
              payslips.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{formatINR(p.gross)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatINR(p.totalDeductions)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatINR(p.net)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" onClick={() => setSelected(p)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {selected ? <PayslipDetail payslip={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function PayslipDetail({ payslip, onClose }: { payslip: Payslip; onClose: () => void }) {
  const earnings = payslip.lines.filter((l) => l.type === 'EARNING');
  const deductions = payslip.lines.filter((l) => l.type === 'DEDUCTION');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Payslip</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {payslip.employeeName ? (
          <p className="mb-4 text-sm text-slate-500">{payslip.employeeName} · {payslip.employeeCode}</p>
        ) : null}

        <p className="mb-1 text-xs font-medium uppercase text-slate-400">Earnings</p>
        <ul className="mb-4 space-y-1 text-sm">
          {earnings.map((l) => (
            <li key={l.code} className="flex justify-between">
              <span className="text-slate-600">{l.label}</span>
              <span className="text-slate-900">{formatINR(l.amount)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-slate-100 pt-1 font-medium">
            <span>Gross</span>
            <span>{formatINR(payslip.gross)}</span>
          </li>
        </ul>

        <p className="mb-1 text-xs font-medium uppercase text-slate-400">Deductions</p>
        <ul className="mb-4 space-y-1 text-sm">
          {deductions.length === 0 ? (
            <li className="text-slate-400">None</li>
          ) : (
            deductions.map((l) => (
              <li key={l.code} className="flex justify-between">
                <span className="text-slate-600">{l.label}</span>
                <span className="text-slate-900">−{formatINR(l.amount)}</span>
              </li>
            ))
          )}
          <li className="flex justify-between border-t border-slate-100 pt-1 font-medium">
            <span>Total deductions</span>
            <span>−{formatINR(payslip.totalDeductions)}</span>
          </li>
        </ul>

        <div className="flex justify-between rounded-md bg-brand-50 px-3 py-2 text-base font-semibold text-brand-700">
          <span>Net pay</span>
          <span>{formatINR(payslip.net)}</span>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={() =>
              payrollApi.downloadPayslipPdf(
                payslip.id,
                `payslip-${payslip.employeeCode || payslip.employeeId}.pdf`,
              )
            }
          >
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
