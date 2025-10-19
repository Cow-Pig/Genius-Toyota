'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, HelpCircle, Sparkles, ShoppingCart } from 'lucide-react';
import { ToyotaLogo } from '../icons/ToyotaLogo';
import { useScenario } from '@/hooks/use-scenario';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { PrequalDialog, PrequalFormValues } from '../checkout/PrequalDialog';
import { useMockDataProvider } from '@/lib/mock-data-provider';

export function Header() {
  const { scenario, savedScenarios } = useScenario();
  const { toast } = useToast();
  const { fetchCreditReport } = useMockDataProvider();
  const [isPrequalOpen, setIsPrequalOpen] = useState(false);
  const [isSubmittingPrequal, setIsSubmittingPrequal] = useState(false);
  const [lastPrequalSubmission, setLastPrequalSubmission] = useState<PrequalFormValues | null>(null);

  const handleShare = () => {
    const data = {
        scenario,
        savedScenarios,
    };
    const serialized = btoa(JSON.stringify(data));
    const url = `${window.location.origin}?scenario=${serialized}`;
    navigator.clipboard.writeText(url);
    toast({
        title: "Link Copied!",
        description: "Your scenario has been copied to your clipboard.",
    });
  };

  const handleExport = () => {
    window.print();
  };


  const handlePrequalSubmit = async (values: PrequalFormValues) => {
    setIsSubmittingPrequal(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const report = await fetchCreditReport();
      setLastPrequalSubmission(values);
      toast({
        title: 'Pre-qualification submitted',
        description: `We captured your info and pulled a mock ${report.score} (${report.scoreBand}) snapshot. A dealer will follow up shortly.`,
      });
      setIsPrequalOpen(false);
    } catch (error) {
      toast({
        title: 'Unable to complete pre-qualification',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPrequal(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" passHref>
              <ToyotaLogo className="h-6 w-auto text-primary cursor-pointer" />
            </Link>
            <div className="w-px h-6 bg-border" />
            <h1 className="text-xl font-bold tracking-tight font-headline">
              Finance Navigator
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/offers" passHref>
              <Button variant="outline" size="sm">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View All Offers
              </Button>
            </Link>
            <Link href="/quiz" passHref>
              <Button variant="outline" size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Find Your Match
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => alert('Help is on the way!')}>
              <HelpCircle className="h-5 w-5" />
              <span className="sr-only">Help</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              size="sm"
              className="ml-2 bg-primary hover:bg-primary/90"
              onClick={() => setIsPrequalOpen(true)}
            >
              Get Pre-Qualified
            </Button>
          </div>
        </div>
      </header>
      <PrequalDialog
        open={isPrequalOpen}
        onOpenChange={setIsPrequalOpen}
        onSubmit={handlePrequalSubmit}
        isSubmitting={isSubmittingPrequal}
        initialValues={lastPrequalSubmission ?? undefined}
      />
    </>
  );
}
