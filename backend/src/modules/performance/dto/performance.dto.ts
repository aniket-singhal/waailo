import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGoalDto {
  @ApiPropertyOptional({ description: 'Employee id (HR only); defaults to self' })
  @IsOptional()
  @IsString()
  employeeId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metric?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() target?: string;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateGoalDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export class CreateCycleDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ example: '2026-01-01' }) @IsDateString() periodStart!: string;
  @ApiProperty({ example: '2026-06-30' }) @IsDateString() periodEnd!: string;
}

export class CycleStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'OPEN', 'CLOSED'] })
  @IsString()
  status!: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export class CreateReviewDto {
  @ApiProperty() @IsString() @IsNotEmpty() cycleId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() employeeId!: string;
}

export class SubmitReviewDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() strengths?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() improvements?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
}
