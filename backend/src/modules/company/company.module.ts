import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from './repositories/company.repository';
import { OrgRepository } from './repositories/org.repository';

@Module({
  imports: [AuthModule],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository, OrgRepository],
  exports: [CompanyRepository, OrgRepository],
})
export class CompanyModule {}
