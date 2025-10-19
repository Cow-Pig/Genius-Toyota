'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { useCheckout } from './CheckoutProvider';

const customerOfferSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export type CustomerOfferFormValues = z.infer<typeof customerOfferSchema>;

export function CustomerOfferForm() {
  const { shopperEmail, setShopperEmail } = useCheckout();
  const [isSaved, setIsSaved] = useState(false);

  const form = useForm<CustomerOfferFormValues>({
    resolver: zodResolver(customerOfferSchema),
    defaultValues: { email: shopperEmail },
  });

  useEffect(() => {
    form.reset({ email: shopperEmail });
  }, [shopperEmail, form]);

  useEffect(() => {
    if (!isSaved) return;
    const timeout = setTimeout(() => setIsSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [isSaved]);

  const watchedEmail = form.watch('email');
  const trimmedEmail = useMemo(() => watchedEmail.trim(), [watchedEmail]);
  const hasChanges = trimmedEmail !== (shopperEmail ?? '');

  const onSubmit = (values: CustomerOfferFormValues) => {
    const normalizedEmail = values.email.trim();
    setShopperEmail(normalizedEmail);
    form.reset({ email: normalizedEmail });
    setIsSaved(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Customer Contact</CardTitle>
          <CardDescription>
            Capture the shopper email so updates, disclosures, and contract copies arrive in the right inbox.
          </CardDescription>
        </div>
        {isSaved && (
          <Badge variant="outline" className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-3" /> Saved
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sm:flex-1">
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="jamie@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={!hasChanges || form.formState.isSubmitting}>
              {isSaved && !hasChanges ? 'Email saved' : 'Save email'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
