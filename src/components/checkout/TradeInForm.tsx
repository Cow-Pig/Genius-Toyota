
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, UploadCloud } from 'lucide-react';
import { useCheckout } from './CheckoutProvider';

const tradeInSchema = z.object({
  vin: z.string().length(17, 'VIN must be 17 characters'),
});

const mockVinData = {
  '12345678901234567': {
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    trim: 'XSE',
  },
};

function PhotoUpload({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
      <UploadCloud className="mb-2 h-10 w-10 text-gray-400" />
      <p className="mb-1 text-sm text-gray-600">{label}</p>
      <p className="text-xs text-gray-500">Drag & drop or click to upload</p>
    </div>
  );
}

export function TradeInForm() {
  const [vinData, setVinData] = useState<any>(null);
  const { tradeInValue } = useCheckout();

  const form = useForm<z.infer<typeof tradeInSchema>>({
    resolver: zodResolver(tradeInSchema),
    defaultValues: {
      vin: '12345678901234567',
    },
  });

  function handleVinBlur(vin: string) {
    if (vin.length === 17 && mockVinData[vin]) {
      setVinData(mockVinData[vin]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade-In Vehicle</CardTitle>
        <CardDescription>Enter your vehicle details for an instant trade-in estimate.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                        <Input {...field} onBlur={e => handleVinBlur(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {vinData && (
                    <div className="rounded-lg bg-gray-100 p-4">
                        <p className="font-semibold">{`${vinData.year} ${vinData.make} ${vinData.model} ${vinData.trim}`}</p>
                    </div>
                )}
            </div>

            <Separator />

            <h3 className="text-lg font-medium">Photo Walk-through</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <PhotoUpload label="Front" />
              <PhotoUpload label="Driver's Side" />
              <PhotoUpload label="Rear" />
              <PhotoUpload label="Passenger Side" />
              <PhotoUpload label="Odometer" />
              <PhotoUpload label="Interior" />
            </div>
            {tradeInValue > 0 && (
              <div className="mt-6 flex items-center justify-center rounded-lg bg-green-100 p-6 text-center">
                <DollarSign className="mr-4 h-12 w-12 text-green-700" />
                <div>
                  <p className="text-lg font-semibold text-green-800">Your Trade-In Value</p>
                  <p className="text-4xl font-bold text-green-900">${tradeInValue.toLocaleString()}</p>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
