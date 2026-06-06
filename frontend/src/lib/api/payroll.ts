import { apiFetch, BASE_URL } from './client';
import { tokenStore } from './token-store';
import type { PayrollRun, Payslip } from './types';

export const listRuns = () => apiFetch<PayrollRun[]>('/payroll/runs');

export const createRun = (periodMonth: number, periodYear: number) =>
  apiFetch<PayrollRun>('/payroll/runs', { method: 'POST', body: { periodMonth, periodYear } });

export const processRun = (id: string) =>
  apiFetch<PayrollRun>(`/payroll/runs/${id}/process`, { method: 'POST', body: {} });

export const markPaid = (id: string) =>
  apiFetch<PayrollRun>(`/payroll/runs/${id}/mark-paid`, { method: 'POST', body: {} });

export const listRunPayslips = (id: string) =>
  apiFetch<Payslip[]>(`/payroll/runs/${id}/payslips`);

export const myPayslips = () => apiFetch<Payslip[]>('/payslips');

export const getPayslip = (id: string) => apiFetch<Payslip>(`/payslips/${id}`);

/** Downloads the payslip PDF (sends the bearer token, then triggers a file save). */
export async function downloadPayslipPdf(id: string, filename = 'payslip.pdf'): Promise<void> {
  const res = await fetch(`${BASE_URL}/payslips/${id}/pdf`, {
    headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ''}` },
  });
  if (!res.ok) throw new Error('Failed to download payslip');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
