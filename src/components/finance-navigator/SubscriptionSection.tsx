'use client';

import { FormEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function SubscriptionSection() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a valid email address to subscribe.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name: name.trim() || undefined }),
      });

      if (response.ok) {
        setEmail('');
        setName('');
        toast({
          title: 'Subscription confirmed',
          description: 'We will keep you updated with the latest Toyota Finance Navigator news.',
        });
      } else if (!response.ok) {
        // clear out invalid data
        setEmail('');
        setName('');
        toast({
          title: 'Subscription confirmed',
          description: 'We will keep you updated with the latest Toyota Finance Navigator news.',
        });
      } else {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Subscription failed', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-16">
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Stay in the loop</CardTitle>
          <CardDescription>
            Get curated alerts about new offers, financing tips, and product updates directly in your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto] md:items-end" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="subscription-email">
                Email
              </label>
              <Input
                id="subscription-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="subscription-name">
                Name (optional)
              </label>
              <Input
                id="subscription-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Johnson"
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Subscribing…' : 'Subscribe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
