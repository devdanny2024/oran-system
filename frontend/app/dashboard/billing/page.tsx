"use client";

import { useEffect, useState } from "react";
import { Card } from "../../../src/app/components/ui/card";
import { Badge } from "../../../src/app/components/ui/badge";
import { Button } from "../../../src/app/components/ui/button";
import { Progress } from "../../../src/app/components/ui/progress";
import { CreditCard, FileText, ShieldCheck, TrendingUp } from "lucide-react";

type BillingInvoice = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED";
  type: "INSPECTION_FEE" | "MILESTONE_PAYMENT" | "OTHER";
  externalReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

type FinanceOverview = {
  revenue?: any;
  invoices?: BillingInvoice[];
};

export default function Page() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/finance/overview");
        const isJson =
          res.headers
            .get("content-type")
            ?.toLowerCase()
            .includes("application/json") ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === "string"
              ? body
              : body?.message ?? "Unable to load billing data.";
          setError(message);
          return;
        }

        setOverview(body as FinanceOverview);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load billing data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const invoices = overview?.invoices ?? [];
  const latestPaid = invoices.find((i) => i.status === "PAID") ?? null;
  const usagePercent = 72;

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === "NGN" || currency === "NG" ? "₦" : "";
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Billing & Invoices
      </h1>

      {/* Billing Summary */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Recent activity
            </p>
            <h2 className="text-lg font-semibold">
              {latestPaid
                ? "Latest payment"
                : "No payments recorded yet"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {latestPaid
                ? latestPaid.description ||
                  "Your latest inspection or milestone payment."
                : "Payments and inspection fees will appear here once you start your first project."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Amount
              </span>
              <span className="text-2xl font-semibold">
                {latestPaid
                  ? formatAmount(latestPaid.amount, latestPaid.currency)
                  : "—"}
              </span>
            </div>
            {latestPaid && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Paid on {formatDate(latestPaid.paidAt ?? latestPaid.createdAt)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Next Billing Date</p>
            <p className="font-medium">
              {latestPaid ? "Based on your next project milestone" : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              ORAN charges per inspection and project milestone, not a fixed
              monthly subscription.
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Payment Status</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {latestPaid ? "Active" : "No payments yet"}
              </Badge>
              {latestPaid && (
                <span className="text-xs text-muted-foreground">
                  Last payment received:{" "}
                  {formatDate(latestPaid.paidAt ?? latestPaid.createdAt)}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Usage this cycle</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                {usagePercent}% of estimated project budget
              </span>
            </div>
            <Progress value={usagePercent} />
          </div>
        </div>
      </Card>

      {/* Payment Method & Security */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Payment Method</h2>
            </div>
            <Badge variant="outline" className="text-xs">
              Secured by Paystack
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            ORAN currently processes payments via Paystack. You&apos;ll be
            redirected to a secure Paystack page whenever you pay an inspection
            fee or project milestone.
          </p>
        </Card>

        <Card className="p-6 space-y-3 text-sm">
          <h2 className="text-base font-semibold">Billing & Security</h2>
          <p className="text-muted-foreground">
            Your payments are processed via secure, PCI-compliant providers.
            ORAN never stores your full card details.
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Email receipts for every successful payment.</li>
            <li>• Inspection and milestone invoices in one place.</li>
            <li>• Clear view of what you&apos;ve paid so far.</li>
          </ul>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Invoice History</h2>
          <Button variant="outline" size="sm" disabled>
            <FileText className="mr-1.5 h-4 w-4" />
            Download all as CSV (coming soon)
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-2">{error}</p>
        )}

        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-b bg-secondary px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Date</span>
            <span>Description</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Type</span>
          </div>

          <div className="divide-y text-sm">
            {!loading && invoices.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted-foreground">
                No invoices yet. Your inspection and milestone payments will
                appear here.
              </div>
            )}
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3"
              >
                <span>{formatDate(invoice.paidAt ?? invoice.createdAt)}</span>
                <span className="truncate">
                  {invoice.description ||
                    (invoice.type === "INSPECTION_FEE"
                      ? "Site inspection fee"
                      : "Project payment")}
                </span>
                <span>
                  {formatAmount(invoice.amount, invoice.currency)}
                </span>
                <span>
                  <Badge
                    variant={
                      invoice.status === "PAID" ? "secondary" : "outline"
                    }
                    className="text-xs"
                  >
                    {invoice.status.toLowerCase()}
                  </Badge>
                </span>
                <span className="flex justify-end text-xs text-muted-foreground">
                  {invoice.type === "INSPECTION_FEE"
                    ? "Inspection"
                    : invoice.type === "MILESTONE_PAYMENT"
                    ? "Milestone"
                    : "Other"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 mt-2">
        <p className="text-sm text-muted-foreground">
          Need changes to your invoices or payments? Our team can help.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" disabled>
            Update billing details (coming soon)
          </Button>
          <Button variant="ghost" size="sm">
            Contact billing support
          </Button>
        </div>
      </div>
    </div>
  );
}

