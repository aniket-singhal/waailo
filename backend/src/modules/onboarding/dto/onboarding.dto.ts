import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EducationDto {
  @ApiProperty() @IsString() @IsNotEmpty() qualification!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() institution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() board?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() yearOfPassing?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() percentage?: string;
}

export class PreviousEmploymentDto {
  @ApiProperty() @IsString() @IsNotEmpty() organization!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional({ description: 'Last CTC in paise' }) @IsOptional() @IsInt() lastCtc?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reasonForLeaving?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerContact?: string;
}

export class EmergencyContactDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationship?: string;
  @ApiProperty() @IsString() @IsNotEmpty() contactNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternateNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class NomineeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationship?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sharePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class SaveOnboardingDto {
  // Personal
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() maritalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() personalEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternatePhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() permanentAddress?: string;

  // Statutory
  @ApiPropertyOptional() @IsOptional() @IsString() aadhaarRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() panRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uan?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() prevPfMember?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() esiNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passportNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passportExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drivingLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drivingLicenseExpiry?: string;

  // Bank
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountHolder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;

  // Collections
  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [PreviousEmploymentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PreviousEmploymentDto)
  previousEmployment?: PreviousEmploymentDto[];

  @ApiPropertyOptional({ type: [EmergencyContactDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @ApiPropertyOptional({ type: [NomineeDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => NomineeDto)
  nominees?: NomineeDto[];
}

export class ReviewOnboardingDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class UploadDocTypeDto {
  @ApiProperty({ example: 'Aadhaar Card' })
  @IsString()
  @IsNotEmpty()
  docType!: string;
}
