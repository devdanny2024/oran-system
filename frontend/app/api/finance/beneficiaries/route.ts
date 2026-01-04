import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Stubbed empty list so the finance page
  // can load without depending on backend.
  return NextResponse.json({ items: [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));

  const bankCode = String(payload.bankCode ?? '');
  const bankName = String(payload.bankName ?? '');
  const accountNumber = String(payload.accountNumber ?? '');

  const resolvedName =
    typeof payload.accountName === 'string' && payload.accountName.trim()
      ? payload.accountName.trim()
      : `Account ${accountNumber}`;

  const beneficiary = {
    id: `stub-${Date.now()}`,
    name: resolvedName,
    bankName,
    bankCode,
    accountNumber,
    accountName: resolvedName,
  };

  return NextResponse.json(beneficiary, { status: 201 });
}
