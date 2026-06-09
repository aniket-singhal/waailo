import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateShiftDto {
  @ApiProperty({ example: 'General' }) @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ example: '09:00' }) @Matches(TIME, { message: 'startTime must be HH:mm' }) startTime!: string;
  @ApiProperty({ example: '18:00' }) @Matches(TIME, { message: 'endTime must be HH:mm' }) endTime!: string;
  @ApiPropertyOptional({ example: '1,2,3,4,5', description: 'ISO weekdays, comma-separated' })
  @IsOptional()
  @IsString()
  workingDays?: string;
}

export class AssignShiftDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() shiftId!: string;
  @ApiProperty({ example: '2026-06-01' }) @IsDateString() effectiveFrom!: string;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() effectiveTo?: string;
}
