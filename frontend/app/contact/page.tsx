'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type OranUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
};

export default function ContactPage() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  const whatsappUrl =
    whatsappNumber && whatsappNumber.trim().length > 0
      ? `https://wa.me/${whatsappNumber.trim()}?text=${encodeURIComponent(
          'Hi ORAN, I would like to talk about a smart home project.',
        )}`
      : 'https://wa.me';

  const [user, setUser] = useState<OranUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('oran_user');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as OranUser;
      setUser(parsed);
      if (parsed.name) setName(parsed.name);
      if (parsed.email) setEmail(parsed.email);
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus('Please fill in all fields.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          userId: user?.id ?? null,
        }),
      });

      const isJson =
        res.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const messageText =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to send your message. Please try again.';
        setStatus(messageText);
        return;
      }

      setStatus('Your message has been sent. Our team will reply by email.');
      setSubject('');
      setMessage('');
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : 'Unable to send your message. Please try again.';
      setStatus(messageText);
    } finally {
      setSubmitting(false);
    }
  };

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
            <h2 className="text-base font-semibold">Send us a message</h2>
            <p className="text-muted-foreground">
              Fill in this form and our team will respond to you by email. If
              you are logged in, we&apos;ll link your message to your ORAN
              account so the admin team can see your projects while replying.
            </p>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">
                    Your name
                  </label>
                  <input
                    className="border rounded-md px-2 py-1 text-sm bg-background w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">
                    Email address
                  </label>
                  <input
                    type="email"
                    className="border rounded-md px-2 py-1 text-sm bg-background w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">
                  Subject
                </label>
                <input
                  className="border rounded-md px-2 py-1 text-sm bg-background w-full"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Inspection, quote, billing, or other"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">
                  How can we help?
                </label>
                <textarea
                  className="border rounded-md px-2 py-1 text-sm bg-background w-full min-h-[120px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your question or project."
                />
              </div>
              {status && (
                <p className="text-[11px] text-muted-foreground">{status}</p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Prefer WhatsApp? Open chat instead
                </a>
              </div>
            </form>
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

