'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type RevenueProject = {
  projectId: string;
  projectName: string;
  planType: 'MILESTONE_3' | 'EIGHTY_TEN_TEN';
  totalAmount: number;
  collectedAmount: number;
  devicesCost?: number;
  technicianCostInstall?: number;
  technicianCostIntegration?: number;
  taxAmount?: number;
  grossRevenue?: number;
  profit?: number;
};

type FinanceBeneficiary = {
  id: string;
  name: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

type FinanceDisbursement = {
  id: string;
  amount: number;
  currency: string;
  description?: string | null;
  status: string;
  createdAt: string;
  beneficiary: FinanceBeneficiary;
};

const ALLOWED_ROLES = ['ADMIN', 'CFO'];

export default function FinancePage() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenuePerProject, setRevenuePerProject] = useState<RevenueProject[]>([]);

  const [beneficiaries, setBeneficiaries] = useState<FinanceBeneficiary[]>([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);

  const [disbursements, setDisbursements] = useState<FinanceDisbursement[]>([]);
  const [disbursementsLoading, setDisbursementsLoading] = useState(false);

  const [newBeneficiary, setNewBeneficiary] = useState({
    name: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });

  const [disburseForm, setDisburseForm] = useState({
    beneficiaryId: '',
    amount: '',
    description: '',
  });

  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [savingDisbursement, setSavingDisbursement] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access finance tools.');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as OranUser;

      if (!ALLOWED_ROLES.includes(parsed.role)) {
        toast.error('You do not have access to finance tools.');
        router.replace('/dashboard');
        return;
      }

      setUser(parsed);
    } catch {
      toast.error('Unable to read your session. Please log in again.');
      router.replace('/login');
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadOverview = async () => {
      try {
        setRevenueLoading(true);
        const res = await fetch('/api/admin/revenue/overview');
        const isJson =
          res.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load revenue overview.';
          toast.error(message);
          return;
        }

        const perProject = (((body as any)?.perProject ?? []) as RevenueProject[]).map(
          (p) => ({
            ...p,
            totalAmount: Number(p.totalAmount ?? 0),
            collectedAmount: Number(p.collectedAmount ?? 0),
            devicesCost: Number((p as any).devicesCost ?? 0),
            technicianCostInstall: Number(
              (p as any).technicianCostInstall ?? 0,
            ),
            technicianCostIntegration: Number(
              (p as any).technicianCostIntegration ?? 0,
            ),
            taxAmount: Number((p as any).taxAmount ?? 0),
            grossRevenue: Number(
              (p as any).grossRevenue ?? p.totalAmount ?? 0,
            ),
            profit: Number((p as any).profit ?? 0),
          }),
        );

        setRevenuePerProject(perProject);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load revenue overview. Please try again.';
        toast.error(message);
      } finally {
        setRevenueLoading(false);
      }
    };

    const loadBeneficiaries = async () => {
      try {
        setBeneficiariesLoading(true);
        const res = await fetch('/api/finance/beneficiaries');
        const isJson =
          res.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load beneficiaries.';
          toast.error(message);
          return;
        }

        setBeneficiaries(((body as any)?.items ?? []) as FinanceBeneficiary[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load beneficiaries. Please try again.';
        toast.error(message);
      } finally {
        setBeneficiariesLoading(false);
      }
    };

    const loadDisbursements = async () => {
      try {
        setDisbursementsLoading(true);
        const res = await fetch('/api/finance/disbursements');
        const isJson =
          res.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load disbursements.';
          toast.error(message);
          return;
        }

        setDisbursements(
          (((body as any)?.items ?? []) as FinanceDisbursement[]).map((d) => ({
            ...d,
            amount: Number((d as any).amount ?? 0),
          })),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load disbursements. Please try again.';
        toast.error(message);
      } finally {
        setDisbursementsLoading(false);
      }
    };

    void loadOverview();
    void loadBeneficiaries();
    void loadDisbursements();
  }, [user]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  const handleCreateBeneficiary = async () => {
    if (
      !newBeneficiary.name ||
      !newBeneficiary.bankName ||
      !newBeneficiary.bankCode ||
      !newBeneficiary.accountNumber
    ) {
      toast.error('Please fill in name, bank and account number.');
      return;
    }

    try {
      setSavingBeneficiary(true);
      const res = await fetch('/api/finance/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBeneficiary),
      });
      const isJson =
        res.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to add beneficiary.';
        toast.error(message);
        return;
      }

      toast.success('Beneficiary added.');
      setNewBeneficiary({
        name: '',
        bankName: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',
      });
      setBeneficiaries((prev) => [body as FinanceBeneficiary, ...prev]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to add beneficiary. Please try again.';
      toast.error(message);
    } finally {
      setSavingBeneficiary(false);
    }
  };

  const handleDisburse = async () => {
    if (!disburseForm.beneficiaryId || !disburseForm.amount) {
      toast.error('Please select a beneficiary and amount.');
      return;
    }

    const amountNumber = Number(disburseForm.amount);
    if (!amountNumber || amountNumber <= 0) {
      toast.error('Amount must be greater than zero.');
      return;
    }

    try {
      setSavingDisbursement(true);
      const res = await fetch('/api/finance/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId: disburseForm.beneficiaryId,
          amount: amountNumber,
          description: disburseForm.description || undefined,
        }),
      });
      const isJson =
        res.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to create disbursement.';
        toast.error(message);
        return;
      }

      const status = (body as any).status as string | undefined;
      if (status === 'PENDING_ADMIN_APPROVAL') {
        toast.success(
          'Disbursement recorded and submitted to admin for approval (above 200,000).',
        );
      } else {
        toast.success('Disbursement recorded.');
      }

      setDisburseForm({
        beneficiaryId: '',
        amount: '',
        description: '',
      });

      // Refresh disbursements
      setDisbursements((prev) => [
        {
          ...(body as any),
          amount: Number((body as any).amount ?? 0),
        } as FinanceDisbursement,
        ...prev,
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create disbursement. Please try again.';
      toast.error(message);
    } finally {
      setSavingDisbursement(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finance</h1>
            <p className="text-sm text-muted-foreground">
              Profit breakdown and controlled disbursements for ADMIN and CFO.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin')}
          >
            Back to admin overview
          </Button>
        </div>

        {/* Profit breakdown */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Profit by project</h2>
          <Card className="p-4 text-xs">
            {revenueLoading ? (
              <p className="text-muted-foreground">Loading profit…</p>
            ) : revenuePerProject.length === 0 ? (
              <p className="text-muted-foreground">
                No revenue data yet. Once customers start paying milestones,
                collections and profit will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b text-[11px] text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">
                        Project
                      </th>
                      <th className="text-left py-2 pr-3 font-medium">
                        Plan
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Collected
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Devices cost
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Tech cost
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Tax
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Profit
                      </th>
                      <th className="text-right py-2 font-medium">% Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenuePerProject.map((p) => {
                      const devicesCost = p.devicesCost ?? 0;
                      const techCost =
                        (p.technicianCostInstall ?? 0) +
                        (p.technicianCostIntegration ?? 0);
                      const tax = p.taxAmount ?? 0;
                      const profit = p.profit ?? 0;
                      const revenue = p.totalAmount || 0;
                      const margin =
                        revenue > 0
                          ? Math.round((profit / revenue) * 100)
                          : 0;

                      return (
                        <tr
                          key={p.projectId}
                          className="border-b last:border-b-0 hover:bg-muted/40"
                        >
                          <td className="py-2 pr-3">
                            <span className="font-medium text-foreground">
                              {p.projectName}
                            </span>
                          </td>
                          <td className="py-2 pr-3 capitalize text-muted-foreground">
                            {p.planType === 'MILESTONE_3'
                              ? '3 milestones'
                              : '80 / 10 / 10'}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{p.collectedAmount.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{devicesCost.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{techCost.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{tax.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{profit.toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            {margin}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <Separator />

        {/* Beneficiaries + disbursements */}
        <section className="grid gap-4 md:grid-cols-2 items-start">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Beneficiaries</h2>
                <p className="text-xs text-muted-foreground">
                  Bank accounts that can receive disbursements.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {beneficiariesLoading ? 'Loading…' : `${beneficiaries.length} total`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                className="border rounded-md px-2 py-1 text-xs bg-background"
                placeholder="Display name (e.g. John Doe)"
                value={newBeneficiary.name}
                onChange={(e) =>
                  setNewBeneficiary((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
              <input
                className="border rounded-md px-2 py-1 text-xs bg-background"
                placeholder="Bank name"
                value={newBeneficiary.bankName}
                onChange={(e) =>
                  setNewBeneficiary((prev) => ({
                    ...prev,
                    bankName: e.target.value,
                  }))
                }
              />
              <input
                className="border rounded-md px-2 py-1 text-xs bg-background"
                placeholder="Bank code"
                value={newBeneficiary.bankCode}
                onChange={(e) =>
                  setNewBeneficiary((prev) => ({
                    ...prev,
                    bankCode: e.target.value,
                  }))
                }
              />
              <input
                className="border rounded-md px-2 py-1 text-xs bg-background"
                placeholder="Account number"
                value={newBeneficiary.accountNumber}
                onChange={(e) =>
                  setNewBeneficiary((prev) => ({
                    ...prev,
                    accountNumber: e.target.value,
                  }))
                }
              />
              <input
                className="border rounded-md px-2 py-1 text-xs bg-background col-span-2"
                placeholder="Account name (as returned by bank)"
                value={newBeneficiary.accountName}
                onChange={(e) =>
                  setNewBeneficiary((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
              />
            </div>
            <Button
              size="sm"
              className="mt-1"
              disabled={savingBeneficiary}
              onClick={handleCreateBeneficiary}
            >
              {savingBeneficiary ? 'Saving…' : 'Add beneficiary'}
            </Button>

            <div className="border rounded-md divide-y mt-3 max-h-64 overflow-y-auto">
              {beneficiaries.length === 0 && !beneficiariesLoading ? (
                <div className="p-3 text-xs text-muted-foreground">
                  No beneficiaries yet. Add one using the form above.
                </div>
              ) : (
                beneficiaries.map((b) => (
                  <div key={b.id} className="p-3 text-xs">
                    <p className="font-medium text-foreground">{b.name}</p>
                    <p className="text-muted-foreground">
                      {b.bankName} ({b.bankCode}) · {b.accountNumber}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.accountName}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Disburse funds</h2>
                <p className="text-xs text-muted-foreground">
                  Log disbursements using Paystack controls. Amounts above ₦200,000
                  are submitted to admin instead of auto-disbursed.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <select
                className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                value={disburseForm.beneficiaryId}
                onChange={(e) =>
                  setDisburseForm((prev) => ({
                    ...prev,
                    beneficiaryId: e.target.value,
                  }))
                }
              >
                <option value="">Select beneficiary</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.bankName} · {b.accountNumber}
                  </option>
                ))}
              </select>

              <input
                className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                placeholder="Amount (₦)"
                value={disburseForm.amount}
                onChange={(e) =>
                  setDisburseForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
              />

              <textarea
                className="border rounded-md px-2 py-1 text-xs bg-background w-full min-h-[60px]"
                placeholder="Description / notes (optional)"
                value={disburseForm.description}
                onChange={(e) =>
                  setDisburseForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />

              <p className="text-[11px] text-muted-foreground">
                You cannot auto-disburse more than ₦200,000. Any amount above this
                threshold will be recorded and submitted to an admin for approval.
              </p>

              <Button
                size="sm"
                disabled={savingDisbursement}
                onClick={handleDisburse}
              >
                {savingDisbursement ? 'Saving…' : 'Record disbursement'}
              </Button>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Recent disbursements</h3>
                <span className="text-[11px] text-muted-foreground">
                  {disbursementsLoading
                    ? 'Loading…'
                    : `${disbursements.length} shown`}
                </span>
              </div>
              <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                {disbursements.length === 0 && !disbursementsLoading ? (
                  <div className="p-3 text-xs text-muted-foreground">
                    No disbursements recorded yet.
                  </div>
                ) : (
                  disbursements.map((d) => (
                    <div key={d.id} className="p-3 text-xs flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">
                          ₦{d.amount.toLocaleString()}{' '}
                          <span className="text-[11px] text-muted-foreground">
                            ({d.currency})
                          </span>
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {d.status.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {d.beneficiary?.name} · {d.beneficiary?.bankName} ·{' '}
                        {d.beneficiary?.accountNumber}
                      </p>
                      {d.description && (
                        <p className="text-[11px] text-muted-foreground">
                          {d.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
