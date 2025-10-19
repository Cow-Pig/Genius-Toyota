'use client';

import { Button } from '@/components/ui/button';
import { ToyotaLogo } from '@/components/icons/ToyotaLogo';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
      router.push('/dealer/login');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Sign Out Error', description: 'Could not sign you out.' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dealer/dashboard" passHref>
            <ToyotaLogo className="h-6 w-auto text-primary cursor-pointer" />
          </Link>
          <div className="w-px h-6 bg-border" />
          <h1 className="text-xl font-bold tracking-tight font-headline">
            Dealer Workspace
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/" passHref>
                <Button variant="outline" size="sm">Shopper View</Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
                Sign Out
            </Button>
        </div>
      </div>
    </header>
  );
}
