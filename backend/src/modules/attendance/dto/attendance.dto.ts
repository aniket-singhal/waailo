import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus, WorkMode } from '@prisma/client';

export class CheckInDto {
  @ApiPropertyOptional({ enum: WorkMode, default: WorkMode.ONSITE })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;
}

export class RegularisationRequestDto {
  @ApiProperty({ example: '2026-06-01' }) @IsDateString() date!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  requestedStatus!: AttendanceStatus;

  @ApiPropertyOptional() @IsOptional() @IsDateString() requestedCheckIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() requestedCheckOut?: string;

  @ApiProperty() @IsString() @IsNotEmpty() reason!: string;
}

export class DecisionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';
}

export class AttendanceRangeQueryDto {
  @ApiProperty({ example: '2026-06-01' }) @IsDateString() from!: string;
  @ApiProperty({ example: '2026-06-30' }) @IsDateString() to!: string;
  @ApiPropertyOptional({ description: 'Employee id (HR/manager); defaults to self' })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
