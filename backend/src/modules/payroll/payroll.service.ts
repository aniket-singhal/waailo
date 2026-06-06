import { Injectable, Logger } from '@nestjs/common';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { RoleName } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { EmployeeRepository } from 'src/modules/employees/repositories/employee.repository';
import { SalaryRepository } from 'src/modules/employees/repositories/salary.repository';
import { AttendanceRepository } from 'src/modules/attendance/repositories/attendance.repository';
import { PayrollRunRepository } from './repositories/payroll-run.repository';
import { buildPayslipPdf } from './payslip-pdf';
import { PayslipRepository, PayslipWithLines } from './repositories/payslip.repository';
import { StatutoryRateRepository } from './repositories/statutory-rate.repository';
import { computePayslip, daysInMonth } from './payroll.calculator';
import { CreateRunDto } from './dto/payroll.dto';

interface SalaryComponent {
  code: string;
  label?: string;
  type?: string;
  amount: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly runs: PayrollRunRepository,
    private readonly payslips: PayslipRepository,
    private readonly rates: StatutoryRateRepository,
    private readonly employees: EmployeeRepository,
    private readonly salaries: SalaryRepository,
    private readonly attendance: AttendanceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createRun(companyId: string, dto: CreateRunDto) {
    const existing = await this.runs.findByPeriod(companyId, dto.periodYear, dto.periodMonth);
    if (existing) {
      throw new ConflictError('A payroll run for this period already exists', 'PAYROLL_RUN_EXISTS');
    }
    return this.runs.create(companyId, dto.periodMonth, dto.periodYear);
  }

  listRuns(companyId: string) {
    return this.runs.list(companyId);
  }

  async getRun(companyId: string, id: string) {
    const run = await this.runs.findById(companyId, id);
    if (!run) throw new NotFoundError('Payroll run not found');
    return run;
  }

  /** Computes payslips for all active employees with an active salary structure. */
  async process(companyId: string, runId: string) {
    const run = await this.runs.findById(companyId, runId);
    if (!run) throw new NotFoundError('Payroll run not found');
    if (run.status === 'PAID') {
      throw new UnprocessableError('A paid run cannot be re-processed', 'RUN_ALREADY_PAID');
    }

    await this.runs.update(runId, { status: 'PROCESSING' });
    try {
      const periodStart = new Date(Date.UTC(run.periodYear, run.periodMonth - 1, 1));
      const periodEnd = new Date(Date.UTC(run.periodYear, run.periodMonth, 0));
      const statutory = await this.rates.getRates('IN', periodEnd);
      const dim = daysInMonth(run.periodMonth, run.periodYear);
      const employees = await this.employees.listActive(companyId);

      let totalGross = 0;
      let totalNet = 0;
      let count = 0;

      for (const emp of employees) {
        const salary = await this.salaries.findActive(companyId, emp.id);
        if (!salary) continue; // no compensation set → skip

        const monthlyGross = Math.round(salary.ctcAnnual / 12);
        const monthlyBasic = this.monthlyBasic(salary.components, monthlyGross);

        // Loss-of-pay = ABSENT days recorded in the period (unpaid).
        const records = await this.attendance.rangeForEmployee(
          companyId,
          emp.id,
          periodStart,
          periodEnd,
        );
        const lossOfPayDays = records.filter((r) => r.status === 'ABSENT').length;

        const draft = computePayslip({
          monthlyGross,
          monthlyBasic,
          daysInMonth: dim,
          lossOfPayDays,
          annualGrossForTds: salary.ctcAnnual,
          rates: statutory,
        });

        await this.payslips.upsertWithLines({
          companyId,
          payrollRunId: runId,
          employeeId: emp.id,
          gross: draft.gross,
          totalDeductions: draft.totalDeductions,
          net: draft.net,
          lines: draft.lines,
        });
        totalGross += draft.gross;
        totalNet += draft.net;
        count += 1;
      }

      const updated = await this.runs.update(runId, {
        status: 'COMPLETED',
        totalGross,
        totalNet,
        processedAt: new Date(),
      });
      this.logger.log(`Payroll run ${runId} completed: ${count} payslip(s)`);
      return updated;
    } catch (err) {
      await this.runs.update(runId, { status: 'FAILED' });
      throw err;
    }
  }

  async markPaid(companyId: string, runId: string) {
    const run = await this.runs.findById(companyId, runId);
    if (!run) throw new NotFoundError('Payroll run not found');
    if (run.status !== 'COMPLETED') {
      throw new UnprocessableError('Only a completed run can be marked paid', 'RUN_NOT_COMPLETED');
    }
    return this.runs.update(runId, { status: 'PAID' });
  }

  async listRunPayslips(companyId: string, runId: string) {
    const run = await this.runs.findById(companyId, runId);
    if (!run) throw new NotFoundError('Payroll run not found');
    const slips = await this.payslips.listByRun(companyId, runId);
    return this.enrich(companyId, slips);
  }

  async myPayslips(user: AuthUser) {
    const self = await this.employees.findByUserId(user.companyId, user.userId);
    if (!self) {
      throw new UnprocessableError('Your user is not linked to an employee record', 'NO_EMPLOYEE');
    }
    const slips = await this.payslips.listForEmployee(user.companyId, self.id);
    return this.enrich(user.companyId, slips);
  }

  async getPayslip(user: AuthUser, id: string) {
    const slip = await this.payslips.findById(user.companyId, id);
    if (!slip) throw new NotFoundError('Payslip not found');
    if (!this.hasHrAccess(user)) {
      const self = await this.employees.findByUserId(user.companyId, user.userId);
      if (!self || self.id !== slip.employeeId) {
        throw new ForbiddenError('Not allowed to view this payslip');
      }
    }
    const [enriched] = await this.enrich(user.companyId, [slip]);
    return enriched;
  }

  async getPayslipPdf(user: AuthUser, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const slip = await this.getPayslip(user, id); // includes ownership check
    const run = await this.runs.findById(user.companyId, slip.payrollRunId);
    const company = await this.prisma.company.findUnique({ where: { id: user.companyId } });
    const period = run ? `${MONTHS[run.periodMonth - 1]} ${run.periodYear}` : '';
    const buffer = await buildPayslipPdf({
      companyName: company?.name ?? 'Company',
      period,
      employeeName: slip.employeeName,
      employeeCode: slip.employeeCode,
      earnings: slip.lines.filter((l) => l.type === 'EARNING').map((l) => ({ label: l.label, amount: l.amount })),
      deductions: slip.lines.filter((l) => l.type === 'DEDUCTION').map((l) => ({ label: l.label, amount: l.amount })),
      gross: slip.gross,
      totalDeductions: slip.totalDeductions,
      net: slip.net,
    });
    const filename = `payslip-${slip.employeeCode || slip.employeeId}-${period.replace(' ', '-')}.pdf`;
    return { buffer, filename };
  }

  // ---- helpers ----
  private hasHrAccess(user: AuthUser): boolean {
    return user.roles.includes(RoleName.OWNER) || user.roles.includes(RoleName.HR_ADMIN);
  }

  private monthlyBasic(components: unknown, monthlyGross: number): number {
    const list = Array.isArray(components) ? (components as SalaryComponent[]) : [];
    const basic = list.find((c) => c?.code === 'BASIC');
    if (basic && typeof basic.amount === 'number') {
      return Math.round(basic.amount / 12);
    }
    return Math.round(monthlyGross * 0.5); // sensible default: 50% of gross
  }

  private async enrich(companyId: string, slips: PayslipWithLines[]) {
    const result = [];
    for (const s of slips) {
      const emp = await this.employees.findById(companyId, s.employeeId);
      result.push({
        id: s.id,
        payrollRunId: s.payrollRunId,
        employeeId: s.employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
        employeeCode: emp?.employeeCode ?? '',
        gross: s.gross,
        totalDeductions: s.totalDeductions,
        net: s.net,
        paidAt: s.paidAt,
        lines: s.lines.map((l) => ({
          type: l.type,
          code: l.code,
          label: l.label,
          amount: l.amount,
          isStatutory: l.isStatutory,
        })),
      });
    }
    return result;
  }
}
