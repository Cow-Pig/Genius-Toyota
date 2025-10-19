
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Lock } from 'lucide-react';

const paymentSchema = z.object({
  shopperEmail: z.string().email('Enter a valid email address'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
  cardNumber: z.string().regex(/^(\d{4} ?){4}$/, 'Invalid card number'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/, 'Invalid expiry date (MM/YY)'),
  cvc: z.string().regex(/^\d{3,4}$/, 'Invalid CVC'),
});

export function PaymentForm() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
        shopperEmail: '',
        cardholderName: '',
        cardNumber: '',
        expiryDate: '',
        cvc: ''
    }
  });

  async function onSubmit(values: z.infer<typeof paymentSchema>) {
    setIsProcessing(true);
    // Simulate API call to payment processor
    await new Promise(resolve => setTimeout(resolve, 2000));
    setConfirmationEmail(values.shopperEmail);
    setIsProcessing(false);
    setIsPaid(true);
  }

  if (isPaid) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-green-600 font-semibold'>Your deposit has been successfully processed.</p>
                {confirmationEmail && (
                  <p className='text-sm text-muted-foreground mt-2'>We'll send a receipt and next steps to {confirmationEmail}.</p>
                )}
            </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay Deposit</CardTitle>
        <CardDescription>Enter your contact and payment information to securely place your deposit.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shopperEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email for receipts</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder='jamie@example.com' autoComplete='email' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardholderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cardholder Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Number</FormLabel>
                  <FormControl>
                    <div className='relative'>
                        <Input {...field} placeholder='0000 0000 0000 0000' />
                        <CreditCard className='absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder='MM/YY' />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="cvc"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>CVC</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder='123' />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : (
                    <div className='flex items-center'>
                        <Lock className='mr-2 h-4 w-4' />
                        Pay Securely
                    </div>
                )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
