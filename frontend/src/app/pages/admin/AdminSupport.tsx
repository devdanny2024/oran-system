'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  name?: string | null;
  email?: string;
  role?: string;
};

type SupportTicket = {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  createdAt: string;
};

const ALLOWED_ROLES = ['ADMIN', 'CFO', 'TECHNICIAN'];

export default function AdminSupport() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access the admin console.');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as OranUser;

      if (!parsed.role || !ALLOWED_ROLES.includes(parsed.role)) {
        toast.error('You do not have access to support tools.');
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

    const loadTickets = async () => {
      try {
        setTicketsLoading(true);
        const res = await fetch('/api/support/admin/tickets');
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
              : body?.message ?? 'Unable to load support tickets.';
          toast.error(message);
          return;
        }

        const items = (((body as any)?.items ?? []) as SupportTicket[]).map(
          (t) => ({
            ...t,
            createdAt: t.createdAt,
          }),
        );

        setTickets(items);
        if (items.length > 0 && !activeTicket) {
          setActiveTicket(items[0]);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load support tickets. Please try again.';
        toast.error(message);
      } finally {
        setTicketsLoading(false);
      }
    };

    void loadTickets();
  }, [user]);

  if (checking || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading support inbox…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Support inbox
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Messages submitted via the Contact Us page. Use this view to see
          customer questions and respond via email.
        </p>
      </div>

      <div className="grid md:grid-cols-[280px,1fr] gap-4">
        <Card className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-foreground">Tickets</p>
            <span className="text-[11px] text-muted-foreground">
              {ticketsLoading ? 'Loading…' : `${tickets.length} total`}
            </span>
          </div>
          <Separator />
          <div className="space-y-1 max-h-[480px] overflow-y-auto">
            {tickets.length === 0 && !ticketsLoading ? (
              <p className="text-[11px] text-muted-foreground">
                No support messages yet.
              </p>
            ) : (
              tickets.map((ticket) => {
                const isActive = activeTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    className={`w-full text-left rounded-md px-2 py-2 text-xs border ${
                      isActive
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-transparent hover:border-border hover:bg-muted/40 text-muted-foreground'
                    }`}
                    onClick={() => setActiveTicket(ticket)}
                  >
                    <p className="font-medium text-foreground truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-[11px] truncate">
                      {ticket.name} · {ticket.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          {activeTicket ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeTicket.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {activeTicket.name} · {activeTicket.email}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(activeTicket.createdAt).toLocaleString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {activeTicket.status.toLowerCase().replace(/_/g, ' ')}
                </span>
              </div>
              <Separator />
              <div className="text-xs whitespace-pre-line text-foreground">
                {activeTicket.message}
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Reply to <span className="font-semibold">{activeTicket.email}</span>{' '}
                  and we&apos;ll send this message as an email from ORAN.
                </p>
                <textarea
                  className="border rounded-md px-2 py-1 text-xs bg-background w-full min-h-[100px]"
                  placeholder="Type your reply to the customer…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={replySubmitting || !replyText.trim()}
                    onClick={async () => {
                      if (!replyText.trim()) return;
                      try {
                        setReplySubmitting(true);
                        const res = await fetch(
                          `/api/support/admin/tickets/${encodeURIComponent(
                            activeTicket.id,
                          )}/reply`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              message: replyText.trim(),
                              adminName: user?.name ?? user?.email ?? 'ORAN support',
                              markResolved: true,
                            }),
                          },
                        );

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
                              : body?.message ?? 'Unable to send reply. Please try again.';
                          toast.error(message);
                          return;
                        }

                        toast.success('Reply sent to customer.');
                        setReplyText('');
                        const updatedStatus =
                          (body as any)?.status ?? activeTicket.status;
                        setTickets((prev) =>
                          prev.map((t) =>
                            t.id === activeTicket.id
                              ? { ...t, status: updatedStatus }
                              : t,
                          ),
                        );
                        setActiveTicket((prev) =>
                          prev ? { ...prev, status: updatedStatus } : prev,
                        );
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : 'Unable to send reply. Please try again.';
                        toast.error(message);
                      } finally {
                        setReplySubmitting(false);
                      }
                    }}
                  >
                    {replySubmitting ? 'Sending…' : 'Send reply & mark resolved'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    This will send an email and set the ticket to resolved.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a ticket on the left to view its details.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
