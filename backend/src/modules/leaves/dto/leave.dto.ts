import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLeaveTypeDto {
  @ApiProperty({ example: 'CL' }) @IsString() @IsNotEmpty() code!: string;
  @ApiProperty({ example: 'Casual Leave' }) @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

export class CreateLeavePolicyDto {
  @ApiProperty() @IsString() @IsNotEmpty() leaveTypeId!: string;
  @ApiProperty({ example: 12 }) @IsNumber() @Min(0) annualQuota!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0) maxCarryForward?: number;
  @ApiPropertyOptional({ default: 0.5 }) @IsOptional() @IsNumber() @Min(0) minPerRequest?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxPerRequest?: number;
  @ApiProperty({ example: '2026-01-01' }) @IsDateString() effectiveFrom!: string;
}

export class ApplyLeaveDto {
  @ApiProperty() @IsString() @IsNotEmpty() leaveTypeId!: string;
  @ApiProperty({ example: '2026-06-10' }) @IsDateString() startDate!: string;
  @ApiProperty({ example: '2026-06-12' }) @IsDateString() endDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class LeaveDecisionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class BalancesQueryDto {
  @ApiPropertyOptional({ description: 'Year (defaults to current)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
}
