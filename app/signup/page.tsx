'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, getCurrentUser } from '@/lib/supabase-data';

export default function SignupPage() {
  const router = useRouter();
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validate inputs
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password);

      // Show success message
      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // Auto-redirect to onboarding after 2 seconds
      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);
    } catch (err: any) {
      console.error('Signup error:', err);
      // Handle specific Supabase errors
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

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
            <div className="mb-4 text-5xl">✨</div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">Account Created!</h1>
            <p className="text-zinc-500 mb-6">
              We've sent you a confirmation email. Please verify your email address to complete your signup.
            </p>
            <p className="text-sm text-zinc-400">
              Let's get you set up...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-on-surface mb-2">Join Bulkine</h1>
          <p className="text-zinc-500">Start your fitness journey today</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm p-8 mb-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all bg-white text-gray-900 placeholder-gray-500"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all bg-white text-gray-900 placeholder-gray-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all bg-white text-gray-900 placeholder-gray-500"
                disabled={loading}
              />
            </div>

            {/* Terms Text */}
            <p className="text-xs text-gray-500">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-on-primary font-bold py-3 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            href="/login"
            className="w-full block text-center px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-primary-brand transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
