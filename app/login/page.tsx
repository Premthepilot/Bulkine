'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, getCurrentUser } from '@/lib/supabase-data';
import { createClient } from '@supabase/supabase-js';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      await signIn(email, password);
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('email not confirmed')) {
        setError('Please confirm your email before logging in');
      } else {
        setError(err.message || 'An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password);
      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Please log in instead.');
      } else if (err.message?.includes('weak password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else if (err.message?.includes('invalid email')) {
        setError('Please enter a valid email address');
      } else {
        setError(err.message || 'An error occurred during signup');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      setLoading(true);

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `window.location.origin`,
        },
      });

      if (error) {
        setError('Failed to sign in with Google');
        console.error('Google auth error:', error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Google auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black">
        <div className="animate-pulse text-blue-300">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black px-4">
        <div className="w-full max-w-sm">
          <div className="bg-gradient-to-br from-blue-900/30 to-black border border-blue-500/20 rounded-3xl p-8 text-center backdrop-blur-sm">
            <div className="mb-4 text-6xl">✨</div>
            <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-gray-300 text-sm">
              Redirecting to get started...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-3 py-6">
      <div className="w-full max-w-sm">
        {/* Header - Show based on mode */}
        {mode === 'login' ? (
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your Bulkine account</p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Get Started</h1>
            <p className="text-gray-500 text-sm">Create your Bulkine account</p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-gray-800 text-xs font-medium mb-1.5">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg bg-blue-50 border-2 border-blue-200 text-gray-900 placeholder-gray-400 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-gray-800 text-xs font-medium mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg bg-blue-50 border-2 border-blue-200 text-gray-900 placeholder-gray-400 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                disabled={loading}
              />
            </div>

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-gray-800 text-xs font-medium mb-1.5">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg bg-blue-50 border-2 border-blue-200 text-gray-900 placeholder-gray-400 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  disabled={loading}
                />
              </div>
            )}

            {/* Helper Text for Signup */}
            {mode === 'signup' && (
              <p className="text-xs text-gray-500">At least 6 characters • Must match confirmation</p>
            )}

            {/* Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-full font-semibold text-white transition-all text-sm ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 text-xs text-gray-400 bg-white">or</span>
            </div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all text-sm active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </button>

          {/* Auth Mode Toggle */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 text-xs text-gray-500 bg-white">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </span>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full py-2.5 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-all text-sm active:bg-gray-100"
          >
            {mode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 font-medium transition-colors text-xs"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
