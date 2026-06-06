import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { EpfConfig, EsiConfig, PtConfig, StatutoryRates, TdsConfig } from '../payroll.calculator';

/** Loads the latest effective statutory rates for a country/period. */
@Injectable()
export class StatutoryRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRates(country: string, asOf: Date): Promise<StatutoryRates> {
    const rows = await this.prisma.statutoryRate.findMany({
      where: { country, effectiveFrom: { lte: asOf } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const rates: StatutoryRates = {};
    for (const row of rows) {
      // Keep the most recent (first seen) per code.
      if (row.code === 'EPF' && !rates.epf) rates.epf = row.config as unknown as EpfConfig;
      if (row.code === 'ESI' && !rates.esi) rates.esi = row.config as unknown as EsiConfig;
      if (row.code === 'PT' && !rates.pt) rates.pt = row.config as unknown as PtConfig;
      if (row.code === 'TDS' && !rates.tds) rates.tds = row.config as unknown as TdsConfig;
    }
    return rates;
  }
}
