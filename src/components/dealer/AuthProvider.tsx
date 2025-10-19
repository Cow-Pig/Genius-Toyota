'use client';

import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const auth = useAuth();

  const [hasSeededProfile, setHasSeededProfile] = useState(false);

  useEffect(() => {
    setHasSeededProfile(false);
  }, [user?.uid]);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: userProfileError,
  } = useDoc<UserProfile>(userProfileRef);

  const normalizedRole = useMemo(() => {
    return userProfile?.role ? userProfile.role.toLowerCase() : undefined;
  }, [userProfile?.role]);

  const isLoading = isUserLoading || (user && isProfileLoading);
  const isAuthPage = pathname === '/dealer/login' || pathname === '/dealer/register';
  const isDealer = normalizedRole === 'dealer';

  useEffect(() => {
    if (
      !user ||
      !firestore ||
      isProfileLoading ||
      userProfile ||
      hasSeededProfile ||
      userProfileError
    ) {
      return;
    }

    const displayName = user.displayName?.trim() || '';
    const [firstName, ...rest] = displayName.split(/\s+/).filter(Boolean);
    const fallbackFirstName = firstName || (user.email ? user.email.split('@')[0] : 'Dealer');
    const fallbackLastName = rest.join(' ') || 'User';

    setHasSeededProfile(true);

    setDocumentNonBlocking(
      doc(firestore, 'users', user.uid),
      {
        role: 'dealer',
        email: user.email ?? '',
        firstName: fallbackFirstName,
        lastName: fallbackLastName,
      },
      { merge: true },
    );
  }, [
    user,
    firestore,
    isProfileLoading,
    userProfile,
    hasSeededProfile,
    userProfileError,
  ]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user && !isAuthPage) {
      router.replace('/dealer/login');
      return;
    }

    if (user && isDealer && isAuthPage) {
      router.replace('/dealer/dashboard');
      return;
    }
  }, [user, isLoading, isDealer, isAuthPage, router]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.replace('/dealer/login');
  };

  const isBootstrappingProfile =
    !!user &&
    !isAuthPage &&
    !isLoading &&
    !userProfile &&
    !userProfileError;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isBootstrappingProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Setting up your dealer workspace…</p>
          <p className="text-sm text-muted-foreground">
            We&apos;re preparing your profile and will take you to the dashboard momentarily.
          </p>
        </div>
      </div>
    );
  }

  if (user && !isAuthPage && userProfileError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">We couldn&apos;t load your dealer profile.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Please verify that your account has access to the dealer workspace or try signing in again.
        </p>
        <Button onClick={handleSignOut} variant="outline">
          Sign out
        </Button>
      </div>
    );
  }

  if (user && !isAuthPage && userProfile && !isDealer) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Dealer access required</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Your account is signed in, but it doesn&apos;t have dealer permissions yet. Reach out to your
          admin to enable dealer access or sign in with a different account.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => router.replace('/')}>Go to homepage</Button>
          <Button onClick={handleSignOut} variant="outline">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (isDealer && !isAuthPage) {
    return <>{children}</>;
  }

  if (!user && isAuthPage) {
    return <>{children}</>;
  }

  return null;
}
