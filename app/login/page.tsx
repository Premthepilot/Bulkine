'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Please confirm your email before logging in.');
      } else if (signInError.message.includes('email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center max-w-md mx-auto bg-surface px-8 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">
          Welcome Back
        </h1>
        <p className="mt-2 text-zinc-500 font-medium">
          Continue your fitness journey
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-600 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-5 py-4 rounded-2xl bg-white border border-zinc-200 text-on-surface placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent transition-all"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-600 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full px-5 py-4 rounded-2xl bg-white border border-zinc-200 text-on-surface placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent transition-all"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-container text-on-primary font-headline font-bold text-lg py-5 rounded-full shadow-lg shadow-primary-container/20 active:scale-95 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* Signup Link */}
      <div className="mt-8 text-center">
        <p className="text-zinc-500 font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary-container hover:underline font-semibold">
            Sign Up
          </Link>
        </p>
      </div>

      {/* Back Link */}
      <Link
        href="/"
        className="mt-6 text-center text-zinc-400 hover:text-zinc-600 transition-colors text-sm"
      >
        ← Back to home
      </Link>
    </div>
  );
}
