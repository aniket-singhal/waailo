import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'demo-co' })
  @IsString()
  @IsNotEmpty()
  companySlug!: string;

  @ApiProperty({ example: 'owner@demo.co' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'demo-co' })
  @IsString()
  @IsNotEmpty()
  companySlug!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class TokenPairDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ description: 'Access token TTL in seconds' })
  expiresIn!: number;
}

export class MeDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ isArray: true })
  roles!: string[];

  @ApiProperty({ required: false, nullable: true })
  employeeId!: string | null;
}
