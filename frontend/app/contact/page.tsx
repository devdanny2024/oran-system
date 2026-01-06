'use client';

import Link from 'next/link';

export default function ContactPage() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  const whatsappUrl =
    whatsappNumber && whatsappNumber.trim().length > 0
      ? `https://wa.me/${whatsappNumber.trim()}?text=${encodeURIComponent(
          'Hi ORAN, I would like to talk about a smart home project.',
        )}`
      : 'https://wa.me';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              ← Back to ORAN home
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Contact us</h1>
          <p className="text-sm text-muted-foreground">
            Reach out to ORAN for questions about inspections, quotes,
            installations or your existing smart home project.
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed">
          <div className="rounded-md border bg-card px-4 py-5 space-y-3">
            <h2 className="text-base font-semibold">Chat with us on WhatsApp</h2>
            <p className="text-muted-foreground">
              The fastest way to reach our team is via WhatsApp. Share your
              project details, photos and questions and we&apos;ll respond as
              soon as possible.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open WhatsApp chat
            </a>
            {!whatsappNumber && (
              <p className="text-[11px] text-muted-foreground mt-1">
                WhatsApp number is not configured yet. Once it&apos;s set up,
                this button will open a chat with our support line.
              </p>
            )}
          </div>

          <div className="rounded-md border bg-card px-4 py-5 space-y-2">
            <h2 className="text-base font-semibold">Dashboard support</h2>
            <p className="text-muted-foreground">
              If you are already an ORAN customer, you can also click the chat
              bubble in the bottom-right corner of your dashboard to jump into a
              WhatsApp conversation from inside your account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

