'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '../../../lib/api';
import { toast } from 'sonner';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

type Category = 'GENERAL' | 'PROJECT' | 'OPERATIONS' | 'BILLING';

export default function SupportPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('GENERAL');
  const [projectId, setProjectId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawUser = window.localStorage.getItem('oran_user');
    if (!rawUser) {
      router.replace('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message.');
      return;
    }

    setIsSubmitting(true);

    const userJson =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('oran_user')
        : null;

    let user:
      | { id: string; email?: string | null; name?: string | null }
      | null = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch {
        user = null;
      }
    }

    const prefix =
      category === 'PROJECT'
        ? '[Project] '
        : category === 'OPERATIONS'
          ? '[Operations] '
          : category === 'BILLING'
            ? '[Billing] '
            : '';

    const prefixedSubject = `${prefix}${subject.trim()}`;

    const fullMessageParts = [
      category !== 'GENERAL'
        ? `Category: ${category.toLowerCase()}${
            category === 'PROJECT' && projectId.trim()
              ? ` (Project ID: ${projectId.trim()})`
              : ''
          }`
        : 'Category: general',
      '',
      message.trim(),
    ];

    const payload = {
      userId: user?.id ?? null,
      projectId: category === 'PROJECT' && projectId.trim() ? projectId.trim() : null,
      category,
      name: user?.name || 'ORAN customer',
      email: user?.email || '',
      subject: prefixedSubject,
      message: fullMessageParts.join('\n'),
    };

    const result = await postJson<{ ticket: { id: string } }, typeof payload>(
      '/support/contact',
      payload,
    );

    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setSubject('');
    setMessage('');
    setProjectId('');
    setCategory('GENERAL');

    toast.success('Your support request has been submitted.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what you need help with. You can raise tickets for your
          project, operations/visits or billing.
        </p>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>What do you need help with?</Label>
            <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
              <Button
                type="button"
                variant={category === 'GENERAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('GENERAL')}
              >
                General
              </Button>
              <Button
                type="button"
                variant={category === 'PROJECT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('PROJECT')}
              >
                Project
              </Button>
              <Button
                type="button"
                variant={category === 'OPERATIONS' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('OPERATIONS')}
              >
                Operations / visits
              </Button>
              <Button
                type="button"
                variant={category === 'BILLING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('BILLING')}
              >
                Billing / payments
              </Button>
            </div>
          </div>

          {category === 'PROJECT' && (
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID (optional)</Label>
              <Input
                id="projectId"
                placeholder="Paste your project ID if you have it"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Short summary of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Details</Label>
            <Textarea
              id="message"
              placeholder="Describe what is happening and how we can help."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Submit ticket'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
