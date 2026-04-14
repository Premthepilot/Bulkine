'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthProtection } from '@/lib/use-auth-protection';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getCurrentUser, signOut } from '@/lib/supabase-data';

export default function ProfilePage() {
  const router = useRouter();

  // Protect route: redirect if not authenticated
  const { isLoading: isAuthLoading, error: authError } = useAuthProtection();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Load user info
  useEffect(() => {
    if (!isAuthLoading) {
      const loadUser = async () => {
        try {
          setIsLoadingProfile(true);
          const userData = await getCurrentUser();
          if (!userData) {
            setProfileError('Unable to load user information');
            return;
          }
          setUser(userData);
        } catch (error) {
          console.error('Error loading user:', error);
          setProfileError('Failed to load your profile. Please refresh the page.');
        } finally {
          setIsLoadingProfile(false);
        }
      };
      loadUser();
    }
  }, [isAuthLoading]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setProfileError('Failed to sign out. Please try again.');
      setIsSigningOut(false);
    }
  };

  // Show loading state while verifying authentication
  if (isAuthLoading) {
    return <LoadingSpinner fullScreen message="Verifying your account..." />;
  }

  // Show auth error
  if (authError) {
    return (
      <ErrorDisplay
        fullScreen
        title="Authentication Error"
        message={authError}
        icon="🔐"
      />
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
          {isLoadingProfile ? (
            <LoadingSpinner message="Loading profile..." />
          ) : profileError ? (
            <ErrorDisplay
              message={profileError}
              onRetry={() => window.location.reload()}
              icon="⚠️"
            />
          ) : (
            <>
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
                      {user?.email || 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                    <p className="text-sm text-gray-600 font-mono">
                      {user?.id ? user.id.substring(0, 16) + '...' : 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Account Created</p>
                    <p className="text-sm text-gray-600">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : 'Unknown'
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
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

