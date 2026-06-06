import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Acme Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  companyName!: string;

  @ApiProperty({ example: 'owner@acme.com' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  ownerPassword!: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class DepartmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}

export class DesignationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string;
}

export class LocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ default: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class CompanyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() country!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() status!: string;
  @ApiProperty() settings!: Record<string, unknown>;
}
