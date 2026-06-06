import { Module } from '@nestjs/common';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentRepository } from './repositories/document.repository';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [StorageModule, EmployeesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentRepository],
})
export class DocumentsModule {}
