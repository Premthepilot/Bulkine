'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthProtection } from '@/lib/use-auth-protection';
import { getCurrentUser, signOut } from '@/lib/supabase-data';

export default function ProfilePage() {
  const router = useRouter();

  // Protect route: redirect if not authenticated
  const { isLoading: isAuthLoading } = useAuthProtection();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user info
  useState(() => {
    if (!isAuthLoading) {
      const loadUser = async () => {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Error loading user:', error);
        }
      };
      loadUser();
    }
  });

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  // Show loading state while verifying authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your account...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-100 flex items-center justify-center"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <div className="w-full max-w-sm min-h-screen bg-[#F8F9FA] flex flex-col">
        {/* Top Gradient Overlay */}
        <div className="fixed top-0 left-0 right-0 h-16 z-30 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Profile
          </h1>
        </header>

        {/* Content */}
        <div className="flex-1 px-6 py-20 flex flex-col">
          {/* User Info Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-xs font-bold text-gray-400 tracking-widest mb-4 uppercase">
              Account Information
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user?.email || 'Loading...'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">User ID</p>
                <p className="text-sm text-gray-600 font-mono">
                  {user?.id ? user.id.substring(0, 16) + '...' : 'Loading...'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Account Created</p>
                <p className="text-sm text-gray-600">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : 'Loading...'
                  }
                </p>
              </div>
            </div>
          </motion.div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sign Out Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="pb-8"
          >
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-2xl transition-colors"
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
