
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCheckout } from './CheckoutProvider';
import { formatCurrency } from '@/lib/utils';

export function ESignModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const { amountDueAtSigning } = useCheckout();

  return (
    <Card>
        <CardHeader>
        <CardTitle>Sign Your Contract</CardTitle>
        <CardDescription>Review and e-sign your retail/lease agreement.</CardDescription>
        </CardHeader>
        <CardContent>
        <Button onClick={() => setIsOpen(true)} className="w-full">Review and Sign</Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Electronic Signature Consent</DialogTitle>
                <DialogDescription>
                Please review the contract below and sign to finalize your purchase.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] rounded-md border p-4">
                <h3 className="font-bold">RETAIL INSTALLMENT SALE CONTRACT</h3>
                <p className='font-bold text-lg'>Amount Due At Signing: {formatCurrency(amountDueAtSigning)}</p>
                <p className="text-sm text-gray-500">This is a mock contract for demonstration purposes only.</p>
                <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ... [Content continues for several pages]</p>
            </ScrollArea>
            <div className="mt-4 flex items-center space-x-2">
                <Checkbox id="terms" checked={isAgreed} onCheckedChange={() => setIsAgreed(!isAgreed)} />
                <Label htmlFor="terms">I have read and agree to the terms of the contract.</Label>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsOpen(false)} variant="outline">Cancel</Button>
                <Button onClick={() => setIsOpen(false)} disabled={!isAgreed}>
                Sign and Accept
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
        </CardContent>
    </Card>
  );
}
