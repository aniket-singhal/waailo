/** Formats integer minor units (paise) as Indian Rupees. */
export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** Converts a rupee amount (string/number) to integer paise. */
export function toPaise(rupees: string | number): number {
  const n = typeof rupees === 'string' ? Number(rupees) : rupees;
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? String(month);
}
