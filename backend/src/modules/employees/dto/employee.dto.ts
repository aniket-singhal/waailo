import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EmployeeStatus, EmploymentType } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

export class CreateEmployeeDto {
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty() @IsEmail() email!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiProperty({ example: '2026-06-01' }) @IsDateString() dateOfJoining!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() employeeCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;

  // Personal
  @ApiPropertyOptional() @IsOptional() @IsString() personalEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternatePhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional({ example: '1995-04-01' }) @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() maritalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroup?: string;

  // Extended org structure
  @ApiPropertyOptional() @IsOptional() @IsString() businessUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewingManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentHeadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() holidayCalendarId?: string;

  // Payroll / statutory
  @ApiPropertyOptional() @IsOptional() payrollActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() panRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() esiNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountHolder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;
}

export class InviteEmployeeDto extends CreateEmployeeDto {
  @ApiPropertyOptional({ description: 'Grant manager role to the invited user' })
  @IsOptional()
  asManager?: boolean;

  @ApiPropertyOptional({ enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'], description: 'Portal role for the invited user' })
  @IsOptional()
  @IsString()
  role?: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: EmployeeStatus })
  @IsEnum(EmployeeStatus)
  status!: EmployeeStatus;
}

export class EmployeeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class SalaryComponentDto {
  @ApiProperty({ example: 'BASIC' }) @IsString() code!: string;
  @ApiProperty({ example: 'Basic' }) @IsString() label!: string;

  @ApiPropertyOptional({ enum: ['EARNING', 'DEDUCTION'], default: 'EARNING' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Annual amount in minor units (paise)' })
  @IsInt()
  @Min(0)
  amount!: number;
}

export class SalaryStructureDto {
  @ApiProperty({ description: 'Annual CTC in minor units (paise)' })
  @IsInt()
  @Min(0)
  ctcAnnual!: number;

  @ApiProperty({ type: [SalaryComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentDto)
  components!: SalaryComponentDto[];

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  effectiveFrom!: string;
}

export class EmployeeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeCode!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() employmentType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() dateOfJoining!: string;
  @ApiProperty({ nullable: true }) departmentId!: string | null;
  @ApiProperty({ nullable: true }) designationId!: string | null;
  @ApiProperty({ nullable: true }) locationId!: string | null;
  @ApiProperty({ nullable: true }) managerId!: string | null;
}
