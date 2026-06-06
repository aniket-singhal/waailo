import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EmploymentType, JobStatus } from '@prisma/client';

export class CreateJobDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  openings?: number;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status!: JobStatus;
}

export class CreateCandidateDto {
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
}

export class ScheduleInterviewDto {
  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' }) @IsDateString() scheduledAt!: string;
  @ApiPropertyOptional({ default: 'VIDEO' }) @IsOptional() @IsString() mode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() interviewerId?: string;
}

export class InterviewFeedbackDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}

export class CreateOfferDto {
  @ApiProperty({ description: 'Annual CTC in minor units (paise)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ctcAnnual!: number;
  @ApiProperty({ example: '2026-08-01' }) @IsDateString() joiningDate!: string;
}
