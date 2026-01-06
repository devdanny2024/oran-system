'use client';

import Link from 'next/link';

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              ← Back to ORAN home
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Refund Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            How ORAN handles refunds for inspection fees, project milestone
            payments and devices.
          </p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold">1. Inspection fees</h2>
          <p className="text-muted-foreground">
            Inspection fees paid through ORAN are{' '}
            <span className="font-semibold text-foreground">
              strictly non-refundable
            </span>
            . Once you complete payment for a site inspection, we immediately
            begin allocating technicians, scheduling and logistics for your
            visit, even if your preferred inspection date has not yet been
            confirmed.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold">2. Project milestone payments</h2>
          <p className="text-muted-foreground">
            Project milestone payments cover devices, installation, integration,
            logistics and other services for your smart home project.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">
                Devices:
              </span>{' '}
              payments are{' '}
              <span className="font-semibold text-foreground">
                refundable only for defective devices
              </span>{' '}
              in line with the manufacturer&apos;s warranty and ORAN&apos;s
              quality checks.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Labour and services:
              </span>{' '}
              installation, configuration, integration and other labour fees are{' '}
              <span className="font-semibold text-foreground">
                non-refundable once work has been completed
              </span>{' '}
              or the milestone has been delivered.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Where a refund is approved for defective devices, ORAN may choose to
            repair, replace or refund the device cost at our discretion, after
            inspection and verification by our team.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold">3. How to request a refund for defective devices</h2>
          <p className="text-muted-foreground">
            If you believe a device supplied by ORAN is defective, please
            contact our support team within the warranty period with:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Project name or ID</li>
            <li>Invoice or payment reference</li>
            <li>Device name, quantity and issue description</li>
            <li>Clear photos or videos showing the fault (where possible)</li>
          </ul>
          <p className="text-muted-foreground">
            Our team will review your request, perform any required remote or
            on-site checks, and confirm next steps (repair, replacement or
            refund of the device portion of the payment).
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold">4. Changes to this policy</h2>
          <p className="text-muted-foreground">
            ORAN may update this refund policy from time to time. The version
            published on this page applies to new payments from the date it is
            updated. If we make significant changes, we may also notify you via
            email or within your ORAN dashboard.
          </p>
        </section>
      </div>
    </main>
  );
}

