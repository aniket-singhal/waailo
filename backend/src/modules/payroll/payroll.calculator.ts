import { PayslipLineType } from '@prisma/client';

/**
 * Pure payroll calculation (unit-tested). All money is in integer minor units
 * (paise). Statutory rates come from the `statutory_rates` table so changes are
 * data, not code (see docs/07 §7.7).
 */

export interface EpfConfig {
  employeeRate: number; // e.g. 0.12
  wageCeiling: number; // monthly basic ceiling in paise (e.g. 1500000 = ₹15,000)
}
export interface EsiConfig {
  employeeRate: number; // e.g. 0.0075
  wageCeilingMonthly: number; // paise (e.g. 2100000 = ₹21,000)
}
export interface PtSlab {
  upto: number | null; // paise; null = no upper bound
  tax: number; // paise
}
export interface PtConfig {
  slabs: PtSlab[];
}

export interface TdsSlab {
  upto: number | null; // annual taxable income ceiling in paise; null = no upper bound
  rate: number; // e.g. 0.05
}
export interface TdsConfig {
  standardDeduction: number; // paise
  rebateLimitTaxable: number; // taxable income at/under which tax is 0 (paise)
  cessRate: number; // e.g. 0.04
  slabs: TdsSlab[];
}

export interface StatutoryRates {
  epf?: EpfConfig;
  esi?: EsiConfig;
  pt?: PtConfig;
  tds?: TdsConfig;
}

export interface PayslipLineDraft {
  type: PayslipLineType;
  code: string;
  label: string;
  amount: number; // paise
  isStatutory: boolean;
}

export interface PayslipDraft {
  gross: number;
  totalDeductions: number;
  net: number;
  lines: PayslipLineDraft[];
}

export interface ComputeInput {
  /** Monthly gross in paise (annual CTC / 12). */
  monthlyGross: number;
  /** Monthly basic in paise (used for EPF). */
  monthlyBasic: number;
  /** Calendar days in the period month. */
  daysInMonth: number;
  /** Unpaid (loss-of-pay) days to deduct. Default 0 = full month. */
  lossOfPayDays?: number;
  /** Projected annual gross (paise) for TDS. Defaults to monthlyGross × 12. */
  annualGrossForTds?: number;
  rates: StatutoryRates;
}

/**
 * Simplified India "new regime" annual TDS estimate. Clearly an estimate — real
 * payroll factors declarations, perks, other income, and the regime choice.
 */
export function computeTds(annualGross: number, cfg?: TdsConfig): number {
  if (!cfg) return 0;
  const taxable = Math.max(0, annualGross - cfg.standardDeduction);
  if (taxable <= cfg.rebateLimitTaxable) return 0;
  let tax = 0;
  let lower = 0;
  for (const slab of cfg.slabs) {
    const upper = slab.upto ?? Infinity;
    if (taxable > lower) {
      const bracket = Math.min(taxable, upper) - lower;
      if (bracket > 0) tax += bracket * slab.rate;
    }
    lower = upper;
    if (taxable <= upper) break;
  }
  return Math.round(tax * (1 + cfg.cessRate));
}

function round(n: number): number {
  return Math.round(n);
}

function resolvePt(gross: number, pt?: PtConfig): number {
  if (!pt || pt.slabs.length === 0) return 0;
  for (const slab of pt.slabs) {
    if (slab.upto === null || gross <= slab.upto) return slab.tax;
  }
  return pt.slabs[pt.slabs.length - 1].tax;
}

export function computePayslip(input: ComputeInput): PayslipDraft {
  const { monthlyGross, monthlyBasic, daysInMonth, rates } = input;
  const lopDays = input.lossOfPayDays ?? 0;

  // Loss of pay reduces the payable gross pro-rata by calendar days.
  const perDay = daysInMonth > 0 ? monthlyGross / daysInMonth : 0;
  const lossOfPay = round(perDay * Math.max(0, lopDays));
  const payableGross = Math.max(0, monthlyGross - lossOfPay);
  const payableBasic = monthlyGross > 0 ? round((monthlyBasic * payableGross) / monthlyGross) : 0;

  const lines: PayslipLineDraft[] = [];

  // ----- Earnings -----
  lines.push({ type: PayslipLineType.EARNING, code: 'BASIC', label: 'Basic', amount: payableBasic, isStatutory: false });
  const allowances = payableGross - payableBasic;
  if (allowances > 0) {
    lines.push({
      type: PayslipLineType.EARNING,
      code: 'ALLOW',
      label: 'Allowances',
      amount: allowances,
      isStatutory: false,
    });
  }
  const gross = payableGross;

  // ----- Deductions (statutory) -----
  let totalDeductions = 0;

  if (rates.epf) {
    const epfBase = Math.min(payableBasic, rates.epf.wageCeiling);
    const epf = round(epfBase * rates.epf.employeeRate);
    if (epf > 0) {
      lines.push({ type: PayslipLineType.DEDUCTION, code: 'EPF', label: 'Provident Fund (EPF)', amount: epf, isStatutory: true });
      totalDeductions += epf;
    }
  }

  if (rates.esi && payableGross <= rates.esi.wageCeilingMonthly) {
    const esi = round(payableGross * rates.esi.employeeRate);
    if (esi > 0) {
      lines.push({ type: PayslipLineType.DEDUCTION, code: 'ESI', label: 'State Insurance (ESI)', amount: esi, isStatutory: true });
      totalDeductions += esi;
    }
  }

  const pt = resolvePt(payableGross, rates.pt);
  if (pt > 0) {
    lines.push({ type: PayslipLineType.DEDUCTION, code: 'PT', label: 'Professional Tax', amount: pt, isStatutory: true });
    totalDeductions += pt;
  }

  // TDS is computed on the projected ANNUAL gross (not the LOP-reduced month),
  // then taken monthly.
  const annualGross = input.annualGrossForTds ?? monthlyGross * 12;
  const annualTds = computeTds(annualGross, rates.tds);
  const monthlyTds = Math.round(annualTds / 12);
  if (monthlyTds > 0) {
    lines.push({ type: PayslipLineType.DEDUCTION, code: 'TDS', label: 'Income Tax (TDS)', amount: monthlyTds, isStatutory: true });
    totalDeductions += monthlyTds;
  }

  return { gross, totalDeductions, net: gross - totalDeductions, lines };
}

export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
