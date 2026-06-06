import { Module } from '@nestjs/common';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { HolidayRepository } from './repositories/holiday.repository';

@Module({
  controllers: [HolidaysController],
  providers: [HolidaysService, HolidayRepository],
  exports: [HolidaysService],
})
export class HolidaysModule {}
