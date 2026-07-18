import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Public } from 'src/common/auth/public.decorator';
import { Roles } from 'src/common/auth/roles.decorator';
import { CurrentUser } from 'src/common/auth/current-user.decorator';
import { AuthUser } from 'src/common/tenant/auth-user';
import { CompanyService } from './company.service';
import {
  CostCenterDto,
  DepartmentDto,
  DesignationDto,
  LocationDto,
  NamedEntityDto,
  SetGeofenceDto,
  SignupDto,
  UpdateSettingsDto,
} from './dto/company.dto';

@ApiTags('company')
@ApiBearerAuth()
@Controller()
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Public()
  @Post('companies/signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: SignupDto) {
    return this.company.signup(dto);
  }

  @Get('company')
  @Roles(RoleName.EMPLOYEE)
  getCompany(@CurrentUser() user: AuthUser) {
    return this.company.getCompany(user.companyId);
  }

  @Patch('company/settings')
  @Roles(RoleName.HR_ADMIN)
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.company.updateSettings(user.companyId, dto);
  }

  @Get('departments')
  @Roles(RoleName.EMPLOYEE)
  listDepartments(@CurrentUser() user: AuthUser) {
    return this.company.listDepartments(user.companyId);
  }

  @Post('departments')
  @Roles(RoleName.HR_ADMIN)
  createDepartment(@CurrentUser() user: AuthUser, @Body() dto: DepartmentDto) {
    return this.company.createDepartment(user.companyId, dto);
  }

  @Get('designations')
  @Roles(RoleName.EMPLOYEE)
  listDesignations(@CurrentUser() user: AuthUser) {
    return this.company.listDesignations(user.companyId);
  }

  @Post('designations')
  @Roles(RoleName.HR_ADMIN)
  createDesignation(@CurrentUser() user: AuthUser, @Body() dto: DesignationDto) {
    return this.company.createDesignation(user.companyId, dto);
  }

  @Get('locations')
  @Roles(RoleName.EMPLOYEE)
  listLocations(@CurrentUser() user: AuthUser) {
    return this.company.listLocations(user.companyId);
  }

  @Post('locations')
  @Roles(RoleName.HR_ADMIN)
  createLocation(@CurrentUser() user: AuthUser, @Body() dto: LocationDto) {
    return this.company.createLocation(user.companyId, dto);
  }

  @Patch('locations/:id/geofence')
  @Roles(RoleName.HR_ADMIN)
  setGeofence(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetGeofenceDto) {
    return this.company.setLocationGeofence(user.companyId, id, dto);
  }

  @Get('business-units')
  @Roles(RoleName.EMPLOYEE)
  listBusinessUnits(@CurrentUser() user: AuthUser) {
    return this.company.listBusinessUnits(user.companyId);
  }

  @Post('business-units')
  @Roles(RoleName.HR_ADMIN)
  createBusinessUnit(@CurrentUser() user: AuthUser, @Body() dto: NamedEntityDto) {
    return this.company.createBusinessUnit(user.companyId, dto.name);
  }

  @Get('grades')
  @Roles(RoleName.EMPLOYEE)
  listGrades(@CurrentUser() user: AuthUser) {
    return this.company.listGrades(user.companyId);
  }

  @Post('grades')
  @Roles(RoleName.HR_ADMIN)
  createGrade(@CurrentUser() user: AuthUser, @Body() dto: NamedEntityDto) {
    return this.company.createGrade(user.companyId, dto.name);
  }

  @Get('cost-centers')
  @Roles(RoleName.EMPLOYEE)
  listCostCenters(@CurrentUser() user: AuthUser) {
    return this.company.listCostCenters(user.companyId);
  }

  @Post('cost-centers')
  @Roles(RoleName.HR_ADMIN)
  createCostCenter(@CurrentUser() user: AuthUser, @Body() dto: CostCenterDto) {
    return this.company.createCostCenter(user.companyId, dto.code, dto.name);
  }
}
