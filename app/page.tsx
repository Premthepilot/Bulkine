'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import Link from "next/link";
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if onboarding is complete
        const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
        if (onboardingComplete) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col justify-between max-w-md mx-auto bg-surface overflow-hidden">
      {/* Hero Image */}
      <section className="relative pt-4 px-8 flex-shrink-0 flex items-center justify-center">
        <div className="relative w-full max-w-[260px] aspect-[1024/1536]">
          {/* Ground shadow */}
          <div
            className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[60%] h-5 rounded-[50%] blur-lg z-[5]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 70%)",
            }}
          />
          <Image
            src="https://lh3.googleusercontent.com/aida/ADBb0ugZZB4AuCpWGPaMFLhQllZ-oOBubEF9JX-jBJpTl6_zxf2mQGLab4Of9AH-2zzsSzS_dLaY-OQRJAr1M8hCwqaGaNdEf3Ewqzh8gV7HZQwqsH2EuOrG4TL9cxBccfib21yABsC2KheleKEkxAqzNY-AAY1xJCBWKKAHo59nl37pjOdwP8qGhKjC17STGM2InPNOOJroN0MPuV6esbrfWqEWgT7e-NDoRWosDbyjBEY9LY1QEc-KOJk4zf2xOEt0wPHokqecuo0PDk8"
            alt="Muscular Capybara Training"
            fill
            priority
            className="relative z-10 object-contain"
          />
        </div>
      </section>

      {/* Headline */}
      <section className="px-10 text-center">
        <h1 className="font-headline font-extrabold text-[2.75rem] leading-[1.1] tracking-tight text-on-surface">
          Build your body.
          <br />
          <span className="text-primary-container">The right way.</span>
        </h1>
        <p className="mt-3 text-zinc-500 font-medium text-lg leading-relaxed">
          No confusion. Just a system that works.
        </p>
      </section>

      {/* CTA Buttons */}
      <footer className="px-8 pb-8 flex flex-col items-center gap-2">
        <Link
          href="/signup"
          className="w-full bg-primary-container text-on-primary font-headline font-bold text-xl py-5 rounded-full shadow-lg shadow-primary-container/20 active:scale-95 transition-transform duration-200 text-center"
        >
          Start Journey
        </Link>
        <Link
          href="/login"
          className="w-full text-zinc-500 font-medium text-base py-3 hover:text-primary-brand transition-colors text-center"
        >
          I already have an account
        </Link>
      </footer>
    </div>
  );
}
