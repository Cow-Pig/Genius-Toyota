'use client';

import { Header } from './Header';
import { OnboardingModal } from './OnboardingModal';
import { LeftSummaryRail } from './LeftSummaryRail';
import { SimulationCanvas } from './SimulationCanvas';
import { DiscoveryRail } from './DiscoveryRail';
import { MathDrawer } from './MathDrawer';
import { SubscriptionSection } from './SubscriptionSection';

export function FinanceNavigator() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground font-body">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            <LeftSummaryRail />
            <SimulationCanvas />
            <DiscoveryRail />
          </div>
          <SubscriptionSection />
        </div>
      </main>
      <OnboardingModal />
      <MathDrawer />
    </div>
  );
}
