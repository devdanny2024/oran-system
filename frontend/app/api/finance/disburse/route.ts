import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));

  const amount = Number(payload.amount ?? 0);
  const beneficiaryId = String(payload.beneficiaryId ?? '');
  const description =
    typeof payload.description === 'string' ? payload.description : null;

  const status =
    amount > 200_000 ? 'PENDING_ADMIN_APPROVAL' : 'SUCCESS';

  const disbursement = {
    id: `stub-${Date.now()}`,
    amount,
    currency: 'NGN',
    description,
    status,
    createdAt: new Date().toISOString(),
    beneficiary: {
      id: beneficiaryId,
      name: 'Beneficiary',
      bankName: '',
      bankCode: '',
      accountNumber: '',
      accountName: '',
    },
  };

  return NextResponse.json(disbursement, { status: 201 });
}
