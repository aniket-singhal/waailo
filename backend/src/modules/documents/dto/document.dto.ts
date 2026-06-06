import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { AccessLevel, DocumentCategory } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

export class UploadIntentDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiProperty({ example: 'application/pdf' }) @IsString() @IsNotEmpty() mimeType!: string;
  @ApiProperty({ description: 'File size in bytes' }) @IsInt() @Min(1) sizeBytes!: number;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ enum: AccessLevel })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional() @IsOptional() @IsString() ownerEmployeeId?: string;
  @ApiPropertyOptional({ example: '2027-01-01' }) @IsOptional() @IsISO8601() expiresAt?: string;
}

export class PresignedUploadDto {
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() objectKey!: string;
}

export class ConfirmUploadDto {
  @ApiProperty() @IsString() @IsNotEmpty() objectKey!: string;
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiProperty() @IsString() @IsNotEmpty() mimeType!: string;
  @ApiProperty() @IsInt() @Min(1) sizeBytes!: number;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ enum: AccessLevel })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional() @IsOptional() @IsString() ownerEmployeeId?: string;
  @ApiPropertyOptional({ example: '2027-01-01' }) @IsOptional() @IsISO8601() expiresAt?: string;
}

export class DocumentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional() @IsOptional() @IsString() ownerEmployeeId?: string;
}

export class DocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() category!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() accessLevel!: string;
  @ApiProperty({ nullable: true }) ownerEmployeeId!: string | null;
  @ApiProperty({ nullable: true }) expiresAt!: string | null;
  @ApiProperty() createdAt!: string;
}
