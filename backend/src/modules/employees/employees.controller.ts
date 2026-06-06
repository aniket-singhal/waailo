import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { EmployeesService } from './employees.service';
import {
  ChangeStatusDto,
  CreateEmployeeDto,
  EmployeeQueryDto,
  InviteEmployeeDto,
  SalaryStructureDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @Roles(RoleName.MANAGER)
  list(@CurrentUser() user: AuthUser, @Query() query: EmployeeQueryDto) {
    return this.employees.list(user, query);
  }

  @Post()
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user.companyId, dto);
  }

  @Post('invite')
  @Roles(RoleName.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteEmployeeDto) {
    return this.employees.invite(user.companyId, dto);
  }

  @Get(':id')
  @Roles(RoleName.MANAGER)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employees.get(user.companyId, id);
  }

  @Patch(':id')
  @Roles(RoleName.HR_ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(user.companyId, id, dto);
  }

  @Put(':id/salary')
  @Roles(RoleName.HR_ADMIN)
  setSalary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SalaryStructureDto,
  ) {
    return this.employees.setSalary(user.companyId, id, dto);
  }

  @Patch(':id/status')
  @Roles(RoleName.HR_ADMIN)
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.employees.changeStatus(user.companyId, id, dto);
  }
}
