import React, { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Wallet, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Onboarding() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.onboard-item',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', clearProps: 'opacity,transform,visibility' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-24 flex items-center justify-center" ref={containerRef}>
      <div className="container mx-auto px-6 max-w-lg">
        <GlassCard variant="elevated" className="p-10 text-center onboard-item">
          <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surge-pale)] flex items-center justify-center text-[var(--surge)] mb-8 shadow-inner border border-[var(--surge-pale-2)]">
            <Wallet size={40} />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-[var(--ink-1)] tracking-tight mb-4">
            Connect Wallet
          </h1>
          
          <p className="text-[var(--ink-3)] font-secondary text-lg mb-10 leading-relaxed">
            Connect your Stellar wallet to start streaming yield from tokenized real-world assets.
          </p>

          <div className="space-y-4 mb-10">
            <MagneticButton variant="neo" className="w-full justify-between px-6 py-4">
              <span className="flex items-center gap-3 font-medium">
                <img src="https://cryptologos.cc/logos/stellar-xlm-logo.svg?v=035" alt="Freighter" className="w-6 h-6 grayscale opacity-70" />
                Freighter
              </span>
              <ArrowRight size={20} className="text-[var(--ink-4)]" />
            </MagneticButton>
            
            <MagneticButton variant="neo" className="w-full justify-between px-6 py-4">
              <span className="flex items-center gap-3 font-medium">
                <img src="https://cryptologos.cc/logos/stellar-xlm-logo.svg?v=035" alt="Albedo" className="w-6 h-6 grayscale opacity-70" />
                Albedo
              </span>
              <ArrowRight size={20} className="text-[var(--ink-4)]" />
            </MagneticButton>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-[var(--ink-4)] font-secondary">
            <ShieldCheck size={16} className="text-[var(--surge)]" />
            <span>Secure connection via Stellar Network</span>
          </div>
        </GlassCard>
        
        <div className="mt-8 text-center onboard-item">
          <Link to="/" className="text-[var(--ink-3)] hover:text-[var(--surge)] transition-colors font-secondary text-sm">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
