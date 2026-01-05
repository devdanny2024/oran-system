import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class PricingSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSettings() {
    const existing = await (this.prisma as any).pricingSettings.findFirst();
    if (existing) return existing;

    return (this.prisma as any).pricingSettings.create({
      data: {
        // Defaults match the initial hard-coded values
        logisticsPerTripLagos: 50000,
        logisticsPerTripWestNear: 60000,
        logisticsPerTripOther: 100000,
        miscRate: 0.05,
        taxRate: 0.075,
      },
    });
  }

  async get() {
    const settings = await this.ensureSettings();
    return settings;
  }

  async update(payload: {
    logisticsPerTripLagos?: number;
    logisticsPerTripWestNear?: number;
    logisticsPerTripOther?: number;
    miscRatePercent?: number;
    taxRatePercent?: number;
  }) {
    const settings = await this.ensureSettings();

    const data: any = {};

    const toAmount = (value: unknown, field: string) => {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        throw new BadRequestException(`${field} must be a non-negative number.`);
      }
      return num;
    };

    if (payload.logisticsPerTripLagos !== undefined) {
      data.logisticsPerTripLagos = toAmount(
        payload.logisticsPerTripLagos,
        'logisticsPerTripLagos',
      );
    }
    if (payload.logisticsPerTripWestNear !== undefined) {
      data.logisticsPerTripWestNear = toAmount(
        payload.logisticsPerTripWestNear,
        'logisticsPerTripWestNear',
      );
    }
    if (payload.logisticsPerTripOther !== undefined) {
      data.logisticsPerTripOther = toAmount(
        payload.logisticsPerTripOther,
        'logisticsPerTripOther',
      );
    }

    const toRate = (value: unknown, field: string) => {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        throw new BadRequestException(
          `${field} must be between 0 and 100 (percent).`,
        );
      }
      return num / 100;
    };

    if (payload.miscRatePercent !== undefined) {
      data.miscRate = toRate(payload.miscRatePercent, 'miscRatePercent');
    }
    if (payload.taxRatePercent !== undefined) {
      data.taxRate = toRate(payload.taxRatePercent, 'taxRatePercent');
    }

    const updated = await (this.prisma as any).pricingSettings.update({
      where: { id: settings.id },
      data,
    });

    return updated;
  }
}
