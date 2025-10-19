'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserLoading || (user && isProfileLoading);
  const isAuthPage = pathname === '/dealer/login' || pathname === '/dealer/register';
  const isDealer = userProfile && userProfile.role === 'dealer';

  useEffect(() => {
    // Don't run redirection logic until all data is loaded
    if (isLoading) {
      return;
    }

    // If user is not logged in, they should be on an auth page.
    // If not, redirect them to login.
    if (!user && !isAuthPage) {
      router.replace('/dealer/login');
      return;
    }

    // If user is logged in...
    if (user) {
      // and they are not a dealer, redirect them to the home page.
      if (userProfile && !isDealer) {
        router.replace('/');
        return;
      }
      // and they ARE a dealer and currently on an auth page, redirect to the dashboard.
      if (isDealer && isAuthPage) {
        router.replace('/dealer/dashboard');
        return;
      }
    }
  }, [user, userProfile, isLoading, isDealer, isAuthPage, router]);

  // If still loading, show a full-screen spinner.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If a logged-in dealer is on a protected page, show the content.
  if (isDealer && !isAuthPage) {
    return <>{children}</>;
  }

  // If a non-logged-in user is on an auth page, show the content.
  if (!user && isAuthPage) {
    return <>{children}</>;
  }

  // In all other cases (e.g., during a redirect), render nothing to avoid flashes of content.
  return null;
}
