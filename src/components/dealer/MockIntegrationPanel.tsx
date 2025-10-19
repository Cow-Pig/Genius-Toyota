'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMockDataProvider } from '@/lib/mock-data-provider';
import type { MockDataProviderFailureMode } from '@/types';
import { Info } from 'lucide-react';

const failureOptions: { value: MockDataProviderFailureMode; label: string; helper: string }[] = [
  { value: 'none', label: 'Always succeed', helper: 'Deterministic happy-path responses.' },
  { value: 'needsAttention', label: 'Needs attention', helper: 'Surface soft warnings while still returning data.' },
  { value: 'timeout', label: 'Timeout', helper: 'Simulate latency or network interruptions.' },
  { value: 'error', label: 'Error', helper: 'Return a hard failure from the provider.' },
];

const services = [
  { key: 'bankLink', label: 'Mock bank link' },
  { key: 'irsTranscript', label: 'IRS transcript' },
  { key: 'creditReport', label: 'Credit report' },
  { key: 'inventory', label: 'Inventory feed' },
] as const;

type ServiceKey = (typeof services)[number]['key'];

export function MockIntegrationPanel() {
  const { config, setConfig } = useMockDataProvider();

  const handleLatencyChange = (value: number) => {
    setConfig({ latencyMs: Math.max(0, value) });
  };

  const handleFailureModeChange = (service: ServiceKey, value: MockDataProviderFailureMode) => {
    setConfig({
      failureModes: {
        ...config.failureModes,
        [service]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mock integrations</CardTitle>
        <CardDescription>
          Tune latency and failure modes for the deterministic data layer. Perfect for demo rehearsals and
          compliance sign-off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="latency">Latency (ms)</Label>
          <Input
            id="latency"
            type="number"
            min={0}
            value={config.latencyMs}
            onChange={(event) => handleLatencyChange(Number(event.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Applies to all mock providers. Set to 0 for instant responses or bump it up to demonstrate spinners and retry flows.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <div key={service.key} className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium capitalize">{service.label}</p>
                  <p className="text-xs text-muted-foreground">{service.key}</p>
                </div>
              </div>
              <Select
                value={config.failureModes[service.key]}
                onValueChange={(value) => handleFailureModeChange(service.key, value as MockDataProviderFailureMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select behaviour" />
                </SelectTrigger>
                <SelectContent>
                  {failureOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.helper}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
