import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    TokenService,
    PasswordService,
    JwtStrategy,
    UserRepository,
    RefreshTokenRepository,
  ],
  // Exported so Company (owner creation) and Employees (invites) can manage users.
  exports: [AuthService, UsersService, UserRepository, PasswordService],
})
export class AuthModule {}
