
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Home, MapPin } from 'lucide-react';

const timeSlots = {
    pickup: ['10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'],
    delivery: ['9:00 AM - 12:00 PM', '1:00 PM - 4:00 PM']
}

export function SchedulingForm() {
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Pickup or Delivery</CardTitle>
        <CardDescription>Choose your preferred date and time to receive your new vehicle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup defaultValue="pickup" onValueChange={(value: 'pickup' | 'delivery') => setDeliveryMethod(value)} className="grid grid-cols-2 gap-4">
            <div>
                <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                <Label
                    htmlFor="pickup"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                    <MapPin className="mb-3 h-6 w-6" />
                    Dealership Pickup
                </Label>
            </div>
            <div>
                <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                <Label
                    htmlFor="delivery"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                    <Home className="mb-3 h-6 w-6" />
                    Home Delivery
                </Label>
            </div>
        </RadioGroup>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className='flex justify-center'>
                 <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                />
            </div>
            <div>
                <h4 className="font-semibold mb-3">Available Time Slots</h4>
                <div className="grid grid-cols-2 gap-2">
                    {timeSlots[deliveryMethod].map(slot => (
                        <Button 
                            key={slot} 
                            variant={selectedTime === slot ? 'default' : 'outline'} 
                            onClick={() => setSelectedTime(slot)}
                            disabled={!selectedDate}
                        >
                            {slot}
                        </Button>
                    ))}
                </div>
            </div>
        </div>

        {selectedDate && selectedTime && (
            <div className='space-y-4'>
                 <div className="rounded-lg border bg-gray-50 p-4">
                    <h4 className="font-semibold">Your Appointment</h4>
                    <p>Date: {selectedDate.toLocaleDateString()}</p>
                    <p>Time: {selectedTime}</p>
                    <p>Method: {deliveryMethod === 'pickup' ? 'Dealership Pickup' : 'Home Delivery'}</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Required Items Checklist</h4>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <Checkbox id="id" />
                            <Label htmlFor="id" className="ml-2">Valid Driver's License</Label>
                        </div>
                        <div className="flex items-center">
                            <Checkbox id="insurance" />
                            <Label htmlFor="insurance" className="ml-2">Proof of Insurance</Label>
                        </div>
                        <div className="flex items-center">
                            <Checkbox id="registration" />
                            <Label htmlFor="registration" className="ml-2">Current Vehicle Registration (for trade-in)</Label>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
