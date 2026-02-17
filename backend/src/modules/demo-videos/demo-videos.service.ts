import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export type DemoVideoInput = {
  title: string;
  src: string;
  cost?: string | null;
  location?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

@Injectable()
export class DemoVideosService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureTable() {
    try {
      await (this.prisma as any).$queryRawUnsafe(
        'SELECT 1 FROM "DemoVideo" LIMIT 1',
      );
    } catch (error: any) {
      const code = error?.meta?.code ?? error?.code;
      if (code !== '42P01') throw error;

      await (this.prisma as any).$executeRawUnsafe(
        'CREATE TABLE "DemoVideo" (' +
          '"id" TEXT PRIMARY KEY,' +
          '"title" TEXT NOT NULL,' +
          '"src" TEXT NOT NULL,' +
          '"cost" TEXT,' +
          '"location" TEXT,' +
          '"sortOrder" INTEGER NOT NULL DEFAULT 0,' +
          '"isActive" BOOLEAN NOT NULL DEFAULT TRUE,' +
          '"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),' +
          '"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()' +
          ')',
      );
    }
  }

  async listAll() {
    await this.ensureTable();
    return (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "DemoVideo" ORDER BY "sortOrder" ASC, "createdAt" ASC',
    )) as any[];
  }

  async listActive() {
    await this.ensureTable();
    return (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "DemoVideo" WHERE "isActive" = TRUE ORDER BY "sortOrder" ASC, "createdAt" ASC',
    )) as any[];
  }

  async create(input: DemoVideoInput) {
    await this.ensureTable();

    const id =
      typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `demo_${Date.now()}`;

    await (this.prisma as any).$executeRawUnsafe(
      'INSERT INTO "DemoVideo" ("id","title","src","cost","location","sortOrder","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',
      id,
      input.title,
      input.src,
      input.cost ?? null,
      input.location ?? null,
      Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
      input.isActive ?? true,
    );

    const rows = (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "DemoVideo" WHERE "id" = $1 LIMIT 1',
      id,
    )) as any[];

    return rows[0] ?? null;
  }

  async update(id: string, input: Partial<DemoVideoInput>) {
    await this.ensureTable();

    const fields: string[] = [];
    const values: any[] = [];

    const set = (column: string, value: any) => {
      fields.push(`"${column}" = $${values.length + 1}`);
      values.push(value);
    };

    if (input.title !== undefined) set('title', input.title);
    if (input.src !== undefined) set('src', input.src);
    if (input.cost !== undefined) set('cost', input.cost ?? null);
    if (input.location !== undefined) set('location', input.location ?? null);
    if (input.sortOrder !== undefined) set('sortOrder', Number(input.sortOrder) || 0);
    if (input.isActive !== undefined) set('isActive', Boolean(input.isActive));

    if (fields.length > 0) {
      fields.push('"updatedAt" = NOW()');
      values.push(id);
      await (this.prisma as any).$executeRawUnsafe(
        `UPDATE "DemoVideo" SET ${fields.join(', ')} WHERE "id" = $${values.length}`,
        ...values,
      );
    }

    const rows = (await (this.prisma as any).$queryRawUnsafe(
      'SELECT * FROM "DemoVideo" WHERE "id" = $1 LIMIT 1',
      id,
    )) as any[];

    return rows[0] ?? null;
  }

  async remove(id: string) {
    await this.ensureTable();
    await (this.prisma as any).$executeRawUnsafe(
      'DELETE FROM "DemoVideo" WHERE "id" = $1',
      id,
    );
    return { ok: true };
  }
}
