import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class PricingSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSettings() {
    // Use raw SQL so we don't depend on a generated Prisma delegate
    // for PricingSettings (the client on the server does not expose it yet).
    const existing = (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "PricingSettings" LIMIT 1',
    )) as any[];

    if (existing && existing.length > 0) {
      return existing[0];
    }

    await (this.prisma as any).$executeRawUnsafe(
      'INSERT INTO "PricingSettings" ("id","logisticsPerTripLagos","logisticsPerTripWestNear","logisticsPerTripOther","miscRate","taxRate","createdAt","updatedAt") VALUES (gen_random_uuid(), 50000, 60000, 100000, 0.05, 0.075, NOW(), NOW())',
    );

    const created = (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "PricingSettings" LIMIT 1',
    )) as any[];

    return created[0];
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

    // Apply updates via raw SQL as well.
    const fields: string[] = [];
    const values: any[] = [];

    if (data.logisticsPerTripLagos !== undefined) {
      fields.push('"logisticsPerTripLagos" = $' + (values.length + 1));
      values.push(data.logisticsPerTripLagos);
    }
    if (data.logisticsPerTripWestNear !== undefined) {
      fields.push('"logisticsPerTripWestNear" = $' + (values.length + 1));
      values.push(data.logisticsPerTripWestNear);
    }
    if (data.logisticsPerTripOther !== undefined) {
      fields.push('"logisticsPerTripOther" = $' + (values.length + 1));
      values.push(data.logisticsPerTripOther);
    }
    if (data.miscRate !== undefined) {
      fields.push('"miscRate" = $' + (values.length + 1));
      values.push(data.miscRate);
    }
    if (data.taxRate !== undefined) {
      fields.push('"taxRate" = $' + (values.length + 1));
      values.push(data.taxRate);
    }

    if (fields.length > 0) {
      // Always bump updatedAt
      fields.push('"updatedAt" = NOW()');

      const setClause = fields.join(', ');
      await (this.prisma as any).$executeRawUnsafe(
        `UPDATE "PricingSettings" SET ${setClause} WHERE "id" = '${settings.id}'`,
        ...values,
      );
    }

    const updated = (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "PricingSettings" LIMIT 1',
    )) as any[];

    return updated[0];
  }
}
