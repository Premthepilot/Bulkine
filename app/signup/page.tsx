'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page which now handles both login and signup with tab switching
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black">
      <div className="animate-pulse text-blue-300">Redirecting...</div>
    </div>
  );
}
