"use client";

import { Card } from "../../../src/app/components/ui/card";
import { Badge } from "../../../src/app/components/ui/badge";
import { Button } from "../../../src/app/components/ui/button";
import { Progress } from "../../../src/app/components/ui/progress";
import { CreditCard, FileText, ShieldCheck, TrendingUp } from "lucide-react";

export default function Page() {
  const monthlyCost = 145000; // e.g. ₦145,000
  const usagePercent = 72;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Billing — Living Room Smart Home
      </h1>

      {/* Billing Summary */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Current Plan
            </p>
            <h2 className="text-lg font-semibold">Premium Smart Home Bundle</h2>
            <p className="text-sm text-muted-foreground">
              Includes lighting, climate, access control and surveillance for one living room.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Monthly
              </span>
              <span className="text-2xl font-semibold">
                ₦{monthlyCost.toLocaleString()}
              </span>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Auto-renew enabled
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Next Billing Date</p>
            <p className="font-medium">July 1, 2024</p>
            <p className="text-xs text-muted-foreground">
              Billed every 1st of the month.
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Payment Status</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Active</Badge>
              <span className="text-xs text-muted-foreground">
                Last payment received: June 1, 2024
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Usage this cycle</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                {usagePercent}% of included services
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
              Secured by ORAN Pay
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-secondary/50 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">Visa •••• 4242</p>
              <p className="text-xs text-muted-foreground">
                Expires 08/27 · John Doe
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <span>Default for all subscription charges.</span>
              <span>Back-up payment method: None</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="sm">Update payment method</Button>
            <Button variant="outline" size="sm">
              Add backup method
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-3 text-sm">
          <h2 className="text-base font-semibold">Billing & Security</h2>
          <p className="text-muted-foreground">
            Your payments are processed via secure, PCI-compliant providers. ORAN
            never stores your full card details.
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Automatic retries on failed payments.</li>
            <li>• Email alerts for upcoming renewals.</li>
            <li>• One-click download of invoices and receipts.</li>
          </ul>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Invoice History</h2>
          <Button variant="outline" size="sm">
            <FileText className="mr-1.5 h-4 w-4" />
            Download all as CSV
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-b bg-secondary px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Date</span>
            <span>Description</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y text-sm">
            {[
              {
                date: "June 1, 2024",
                desc: "Premium Smart Home Bundle — Monthly",
                amount: "₦145,000",
                status: "Paid",
              },
              {
                date: "May 1, 2024",
                desc: "Premium Smart Home Bundle — Monthly",
                amount: "₦145,000",
                status: "Paid",
              },
              {
                date: "April 1, 2024",
                desc: "Premium Smart Home Bundle — Monthly",
                amount: "₦145,000",
                status: "Paid",
              },
            ].map((invoice) => (
              <div
                key={invoice.date}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3"
              >
                <span>{invoice.date}</span>
                <span className="truncate">{invoice.desc}</span>
                <span>{invoice.amount}</span>
                <span>
                  <Badge variant="secondary" className="text-xs">
                    {invoice.status}
                  </Badge>
                </span>
                <span className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    PDF
                  </Button>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 mt-2">
        <p className="text-sm text-muted-foreground">
          Need changes to your plan or invoices? Our team can help.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">
            Update billing details
          </Button>
          <Button variant="ghost" size="sm">
            Contact billing support
          </Button>
        </div>
      </div>
    </div>
  );
}
