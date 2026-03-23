'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Setup page has been merged into onboarding
// This page now redirects to onboarding
export default function SetupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to onboarding - all steps are now combined there
    router.replace('/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-zinc-500">Redirecting...</div>
    </div>
  );
}
