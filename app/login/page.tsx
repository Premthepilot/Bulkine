'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Local storage mode - no login needed, redirect to onboarding
    router.replace('/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="animate-pulse text-zinc-500">Redirecting...</div>
    </div>
  );
}
