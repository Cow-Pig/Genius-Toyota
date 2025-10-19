
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { useCheckout } from './CheckoutProvider';

export function FiAddons() {
  const { availableAddons, selectedAddons, toggleAddon, totalAddonsPrice } = useCheckout();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finance & Insurance Add-ons</CardTitle>
        <CardDescription>Protect your investment with our optional coverage plans.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableAddons.map(addon => (
          <div key={addon.id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h4 className="font-semibold">{addon.name}</h4>
              <p className="text-sm text-gray-500">{addon.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <p className="font-semibold">{formatCurrency(addon.price)}</p>
              <Switch
                checked={selectedAddons.includes(addon.id)}
                onCheckedChange={() => toggleAddon(addon.id)}
                aria-label={`Select ${addon.name}`}
              />
            </div>
          </div>
        ))}
        {selectedAddons.length > 0 && (
            <div className='flex justify-end pt-4 font-semibold text-lg'>
                Total Add-ons: {formatCurrency(totalAddonsPrice)}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
