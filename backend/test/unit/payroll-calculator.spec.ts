import {
  computePayslip,
  computeTds,
  daysInMonth,
  StatutoryRates,
  TdsConfig,
} from 'src/modules/payroll/payroll.calculator';

const TDS_CFG: TdsConfig = {
  standardDeduction: 7_500_000, // ₹75,000
  rebateLimitTaxable: 70_000_000, // taxable ≤ ₹7L → nil
  cessRate: 0.04,
  slabs: [
    { upto: 30_000_000, rate: 0 },
    { upto: 70_000_000, rate: 0.05 },
    { upto: 100_000_000, rate: 0.1 },
    { upto: 120_000_000, rate: 0.15 },
    { upto: 150_000_000, rate: 0.2 },
    { upto: null, rate: 0.3 },
  ],
};

// All money in paise. ₹1 = 100 paise.
const RATES: StatutoryRates = {
  epf: { employeeRate: 0.12, wageCeiling: 1_500_000 }, // ₹15,000 basic ceiling
  esi: { employeeRate: 0.0075, wageCeilingMonthly: 2_100_000 }, // ₹21,000 gross ceiling
  pt: { slabs: [{ upto: 2_500_000, tax: 0 }, { upto: null, tax: 20_000 }] }, // ₹200 above ₹25,000
};

describe('computePayslip', () => {
  it('computes EPF (capped), skips ESI above ceiling, applies PT, nets correctly', () => {
    const r = computePayslip({
      monthlyGross: 10_000_000, // ₹100,000
      monthlyBasic: 5_000_000, // ₹50,000
      daysInMonth: 30,
      rates: RATES,
    });
    expect(r.gross).toBe(10_000_000);
    const epf = r.lines.find((l) => l.code === 'EPF');
    expect(epf?.amount).toBe(180_000); // 12% of capped ₹15,000
    expect(r.lines.find((l) => l.code === 'ESI')).toBeUndefined(); // above ESI ceiling
    expect(r.lines.find((l) => l.code === 'PT')?.amount).toBe(20_000); // ₹200
    expect(r.totalDeductions).toBe(200_000);
    expect(r.net).toBe(9_800_000);
  });

  it('applies ESI when gross is under the ceiling', () => {
    const r = computePayslip({
      monthlyGross: 1_500_000, // ₹15,000
      monthlyBasic: 750_000, // ₹7,500
      daysInMonth: 30,
      rates: RATES,
    });
    expect(r.lines.find((l) => l.code === 'EPF')?.amount).toBe(90_000); // 12% of ₹7,500
    expect(r.lines.find((l) => l.code === 'ESI')?.amount).toBe(11_250); // 0.75% of ₹15,000
    expect(r.lines.find((l) => l.code === 'PT')).toBeUndefined(); // ₹15,000 ≤ ₹25,000
    expect(r.net).toBe(1_398_750);
  });

  it('resolves the PT slab at the boundary', () => {
    const atBoundary = computePayslip({ monthlyGross: 2_500_000, monthlyBasic: 0, daysInMonth: 30, rates: RATES });
    expect(atBoundary.lines.find((l) => l.code === 'PT')).toBeUndefined();
    const aboveBoundary = computePayslip({ monthlyGross: 2_500_100, monthlyBasic: 0, daysInMonth: 30, rates: RATES });
    expect(aboveBoundary.lines.find((l) => l.code === 'PT')?.amount).toBe(20_000);
  });

  it('pro-rates gross and basic for loss-of-pay days', () => {
    const r = computePayslip({
      monthlyGross: 3_000_000, // ₹30,000
      monthlyBasic: 1_500_000, // ₹15,000
      daysInMonth: 30,
      lossOfPayDays: 3,
      rates: RATES,
    });
    expect(r.gross).toBe(2_700_000); // 3 of 30 days unpaid
    expect(r.lines.find((l) => l.code === 'EPF')?.amount).toBe(162_000); // 12% of pro-rated basic ₹13,500
    expect(r.net).toBe(2_518_000);
  });

  it('produces no deductions when no rates are configured', () => {
    const r = computePayslip({ monthlyGross: 5_000_000, monthlyBasic: 2_500_000, daysInMonth: 31, rates: {} });
    expect(r.totalDeductions).toBe(0);
    expect(r.net).toBe(5_000_000);
  });
});

describe('computeTds (simplified new regime)', () => {
  it('is zero when taxable income is within the rebate limit', () => {
    // ₹5,00,000 gross − ₹75,000 std = ₹4,25,000 taxable ≤ ₹7L → nil
    expect(computeTds(50_000_000, TDS_CFG)).toBe(0);
  });

  it('computes progressive tax + 4% cess for a ₹12L earner', () => {
    // taxable ₹11,25,000 → 5%·4L + 10%·3L + 15%·1.25L = ₹68,750; +4% cess = ₹71,500
    expect(computeTds(120_000_000, TDS_CFG)).toBe(7_150_000);
  });

  it('returns 0 when no TDS config is provided', () => {
    expect(computeTds(120_000_000, undefined)).toBe(0);
  });
});

describe('computePayslip with TDS', () => {
  it('adds a monthly TDS line from the annual projection', () => {
    const rates: StatutoryRates = { ...RATES, tds: TDS_CFG };
    const r = computePayslip({
      monthlyGross: 10_000_000,
      monthlyBasic: 5_000_000,
      daysInMonth: 30,
      annualGrossForTds: 120_000_000,
      rates,
    });
    const tds = r.lines.find((l) => l.code === 'TDS');
    expect(tds?.amount).toBe(595_833); // ₹71,500 / 12
    // EPF 1,800 + PT 200 + TDS 5,958.33 deducted
    expect(r.totalDeductions).toBe(180_000 + 20_000 + 595_833);
    expect(r.net).toBe(10_000_000 - r.totalDeductions);
  });
});

describe('daysInMonth', () => {
  it('handles month lengths and leap years', () => {
    expect(daysInMonth(6, 2026)).toBe(30);
    expect(daysInMonth(2, 2025)).toBe(28);
    expect(daysInMonth(2, 2024)).toBe(29);
    expect(daysInMonth(1, 2026)).toBe(31);
  });
});
