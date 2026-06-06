import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCalendarDto {
  @ApiProperty({ example: 2026 }) @Type(() => Number) @IsInt() @Min(2000) year!: number;
  @ApiProperty({ example: 'India 2026' }) @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
}

export class AddHolidayDto {
  @ApiProperty({ example: '2026-01-26' }) @IsDateString() date!: string;
  @ApiProperty({ example: 'Republic Day' }) @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isOptional?: boolean;
}
