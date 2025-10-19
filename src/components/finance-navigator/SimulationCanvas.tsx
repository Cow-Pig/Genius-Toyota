'use client';

import { AffordabilityCard } from './AffordabilityCard';
import { ComparisonView } from './ComparisonView';

export function SimulationCanvas() {
  return (
    <section className="col-span-1 lg:col-span-5 space-y-8">
      <AffordabilityCard />
      <ComparisonView />
    </section>
  );
}
