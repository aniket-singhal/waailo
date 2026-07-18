import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const EXIT_TYPES = [
  'RESIGNATION',
  'TERMINATION',
  'RETIREMENT',
  'END_OF_CONTRACT',
  'OTHER',
] as const;
export type ExitTypeDto = (typeof EXIT_TYPES)[number];

export const EXIT_STATUSES = ['INITIATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type ExitStatusDto = (typeof EXIT_STATUSES)[number];

export class InitiateExitDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeId!: string;
  @ApiProperty({ enum: EXIT_TYPES }) @IsIn(EXIT_TYPES) type!: ExitTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiProperty({ example: '2026-06-30' }) @IsDateString() noticeDate!: string;
  @ApiProperty({ example: '2026-07-31' }) @IsDateString() lastWorkingDay!: string;
}

export class UpdateExitStatusDto {
  @ApiProperty({ enum: EXIT_STATUSES }) @IsIn(EXIT_STATUSES) status!: ExitStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsString() exitInterview?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() rehireEligible?: boolean;
}

export class ToggleTaskDto {
  @ApiProperty() @IsBoolean() done!: boolean;
}
