import PDFDocument from 'pdfkit';

interface PdfLine {
  label: string;
  amount: number;
}

export interface PayslipPdfData {
  companyName: string;
  period: string; // e.g. "June 2026"
  employeeName: string;
  employeeCode: string;
  earnings: PdfLine[];
  deductions: PdfLine[];
  gross: number;
  totalDeductions: number;
  net: number;
}

function inr(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Renders a simple one-page payslip PDF and resolves to a Buffer. */
export function buildPayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor('#16285A').text(data.companyName, { continued: false });
    doc.fontSize(10).fillColor('#5B93D1').text('Waailo HR — Payslip');
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#0f172a').text(`Pay period: ${data.period}`);
    doc.text(`Employee: ${data.employeeName} (${data.employeeCode})`);
    doc.moveDown();

    const left = 50;
    const right = 320;
    const top = doc.y;

    // Earnings column
    doc.fontSize(11).fillColor('#64748b').text('EARNINGS', left, top);
    let y = top + 18;
    doc.fillColor('#0f172a');
    for (const e of data.earnings) {
      doc.text(e.label, left, y);
      doc.text(inr(e.amount), left, y, { width: 230, align: 'right' });
      y += 16;
    }
    doc.font('Helvetica-Bold').text('Gross', left, y);
    doc.text(inr(data.gross), left, y, { width: 230, align: 'right' });
    doc.font('Helvetica');

    // Deductions column
    doc.fontSize(11).fillColor('#64748b').text('DEDUCTIONS', right, top);
    let yd = top + 18;
    doc.fillColor('#0f172a');
    if (data.deductions.length === 0) {
      doc.text('None', right, yd);
      yd += 16;
    }
    for (const d of data.deductions) {
      doc.text(d.label, right, yd);
      doc.text('-' + inr(d.amount), right, yd, { width: 225, align: 'right' });
      yd += 16;
    }
    doc.font('Helvetica-Bold').text('Total deductions', right, yd);
    doc.text('-' + inr(data.totalDeductions), right, yd, { width: 225, align: 'right' });
    doc.font('Helvetica');

    // Net pay
    const netY = Math.max(y, yd) + 40;
    doc.rect(left, netY, 495, 30).fill('#eef2ff');
    doc.fillColor('#4338ca').font('Helvetica-Bold').fontSize(13);
    doc.text('Net pay', left + 12, netY + 9);
    doc.text(inr(data.net), left + 12, netY + 9, { width: 471, align: 'right' });
    doc.font('Helvetica').fillColor('#94a3b8').fontSize(8);
    doc.text('This is a system-generated payslip.', left, netY + 50);

    doc.end();
  });
}
