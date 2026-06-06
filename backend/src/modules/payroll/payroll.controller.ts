import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { PayrollService } from './payroll.service';
import { CreateRunDto } from './dto/payroll.dto';

@ApiTags('payroll')
@ApiBearerAuth()
@Controller()
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Post('payroll/runs')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createRun(@CurrentUser() user: AuthUser, @Body() dto: CreateRunDto) {
    return this.payroll.createRun(user.companyId, dto);
  }

  @Get('payroll/runs')
  @Roles(RoleName.HR_ADMIN)
  listRuns(@CurrentUser() user: AuthUser) {
    return this.payroll.listRuns(user.companyId);
  }

  @Get('payroll/runs/:id')
  @Roles(RoleName.HR_ADMIN)
  getRun(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.getRun(user.companyId, id);
  }

  @Post('payroll/runs/:id/process')
  @Roles(RoleName.HR_ADMIN)
  process(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.process(user.companyId, id);
  }

  @Post('payroll/runs/:id/mark-paid')
  @Roles(RoleName.HR_ADMIN)
  markPaid(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.markPaid(user.companyId, id);
  }

  @Get('payroll/runs/:id/payslips')
  @Roles(RoleName.HR_ADMIN)
  runPayslips(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.listRunPayslips(user.companyId, id);
  }

  @Get('payslips')
  @Roles(RoleName.EMPLOYEE)
  myPayslips(@CurrentUser() user: AuthUser) {
    return this.payroll.myPayslips(user);
  }

  @Get('payslips/:id')
  @Roles(RoleName.EMPLOYEE)
  getPayslip(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.getPayslip(user, id);
  }

  @Get('payslips/:id/pdf')
  @Roles(RoleName.EMPLOYEE)
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.payroll.getPayslipPdf(user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
