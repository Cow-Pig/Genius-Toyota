
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Loader2, UploadCloud } from 'lucide-react';
import { useCheckout } from './CheckoutProvider';
import { useMockDataProvider } from '@/lib/mock-data-provider';
import { vehicleData } from '@/lib/data';
import type { MockInventoryVehicle, VerificationStatus } from '@/types';
import { formatCurrency } from '@/lib/utils';

const tradeInSchema = z.object({
  vin: z.string().length(17, 'VIN must be 17 characters'),
});

const statusVariants: Record<VerificationStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Verified: 'default',
  'Needs Attention': 'destructive',
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}

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
  const { fetchInventory } = useMockDataProvider();
  const { tradeInValue } = useCheckout();
  const [vinData, setVinData] = useState<MockInventoryVehicle | null>(null);
  const [status, setStatus] = useState<VerificationStatus>('Pending');
  const [isDecoding, setIsDecoding] = useState(false);
  const [inventory, setInventory] = useState<MockInventoryVehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof tradeInSchema>>({
    resolver: zodResolver(tradeInSchema),
    defaultValues: {
      vin: '12345678901234567',
    },
  });

  const handleVinBlur = async (vin: string) => {
    if (vin.length !== 17) {
      return;
    }

    setIsDecoding(true);
    setError(null);
    setStatus('Pending');

    try {
      const existingInventory = inventory ?? (await fetchInventory());
      if (!inventory) {
        setInventory(existingInventory);
      }

      const match = existingInventory.find((vehicle) => vehicle.vin.toUpperCase() === vin.toUpperCase());

      if (match) {
        setVinData(match);
        const availableStatus = match.available ? 'Verified' : 'Needs Attention';
        setStatus(availableStatus);
        if (!match.available) {
          setError('This VIN is currently flagged for manual review before appraisal.');
        }
      } else {
        setVinData(null);
        setStatus('Needs Attention');
        setError('VIN not found in mock inventory feed. Upload documents for manual verification.');
      }
    } catch (err) {
      setVinData(null);
      setStatus('Needs Attention');
      setError(err instanceof Error ? err.message : 'Unable to decode VIN right now.');
    } finally {
      setIsDecoding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Trade-In Vehicle</CardTitle>
            <CardDescription>
              Decode the VIN to surface condition flags, packages, and availability from the mock inventory feed.
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
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
                        <Input
                          {...field}
                          onBlur={(event) => handleVinBlur(event.target.value)}
                          placeholder="Enter 17 character VIN"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className={`h-4 w-4 ${isDecoding ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                    <span>{isDecoding ? 'Decoding VIN with mock provider…' : 'VIN decoding runs against deterministic fixtures.'}</span>
                  </div>
                  {vinData ? (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="font-semibold">
                        {(() => {
                          const vehicle = vehicleData.find((item) => item.id === vinData.vehicleId);
                          return vehicle ? `${vehicle.modelName}` : vinData.vehicleId;
                        })()}
                      </p>
                      <p className="text-sm text-muted-foreground">VIN {vinData.vin}</p>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Color</span>
                          <span>{vinData.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>MSRP</span>
                          <span>{formatCurrency(vinData.msrp)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vinData.packages.map((pkg) => (
                            <Badge key={pkg} variant="outline">
                              {pkg}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      VIN details will appear here once decoded.
                    </div>
                  )}
                </div>
            </div>

            {error && <p className="text-sm text-amber-600">{error}</p>}

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
              <div className="mt-6 flex items-center justify-center rounded-lg bg-emerald-100 p-6 text-center">
                <DollarSign className="mr-4 h-12 w-12 text-emerald-700" />
                <div>
                  <p className="text-lg font-semibold text-emerald-800">Instant Trade-In Estimate</p>
                  <p className="text-4xl font-bold text-emerald-900">{formatCurrency(tradeInValue)}</p>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
