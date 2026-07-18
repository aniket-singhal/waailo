import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './common/config/app-config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { EventsModule } from './common/events/events.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { OffboardingModule } from './modules/offboarding/offboarding.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    EventsModule,
    AuthModule,
    CompanyModule,
    EmployeesModule,
    DocumentsModule,
    HolidaysModule,
    AttendanceModule,
    ShiftsModule,
    LeavesModule,
    PayrollModule,
    RecruitmentModule,
    PerformanceModule,
    OffboardingModule,
    OnboardingModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global authentication then role checks (registration order matters).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
