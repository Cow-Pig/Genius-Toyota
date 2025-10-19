'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ModelSuggestions } from "./ModelSuggestions";
import { ArrowRight } from 'lucide-react';

export function DiscoveryRail() {
  return (
    <aside className="col-span-full lg:col-span-3 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Don't Know Where to Start?</CardTitle>
          <CardDescription>Take our quiz to find the perfect model for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/quiz" passHref>
            <Button className="w-full">
              Find Your Match <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
      <ModelSuggestions />
    </aside>
  );
}
