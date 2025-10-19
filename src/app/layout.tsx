import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ScenarioProvider } from '@/contexts/ScenarioContext';
import { CustomerJourneyProvider } from '@/contexts/CustomerJourneyContext';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { MockDataProviderProvider } from '@/lib/mock-data-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Toyota Finance Navigator',
  description:
    'Choose between financing and leasing with zero jargon and crisp, transparent math.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          inter.variable
        )}
      >
        <FirebaseClientProvider>
          <MockDataProviderProvider>
            <ScenarioProvider>
              <CustomerJourneyProvider>
                {children}
                <Toaster />
              </CustomerJourneyProvider>
            </ScenarioProvider>
          </MockDataProviderProvider>
          <FirebaseErrorListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
