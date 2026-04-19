import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Wallet, ShieldCheck, ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '@/stores/walletStore';

export function Onboarding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { connect, connecting, isConnected, publicKey, error, disconnect } = useWalletStore();

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

  // On successful connection, redirect to dashboard
  useEffect(() => {
    if (isConnected && publicKey) {
      const timer = setTimeout(() => navigate('/dashboard'), 1500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, publicKey, navigate]);

  const handleFreighterConnect = async () => {
    await connect();
  };

  return (
    <div className="min-h-screen pt-32 pb-24 flex items-center justify-center" ref={containerRef}>
      <div className="container mx-auto px-6 max-w-lg">
        <GlassCard variant="elevated" className="p-10 text-center onboard-item">
          <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surge-pale)] flex items-center justify-center text-[var(--surge)] mb-8 shadow-inner border border-[var(--surge-pale-2)]">
            {isConnected ? <CheckCircle size={40} /> : <Wallet size={40} />}
          </div>
          
          {isConnected && publicKey ? (
            /* Connected State */
            <>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-[var(--ink-1)] tracking-tight mb-4">
                Wallet Connected!
              </h1>
              <div className="bg-[var(--paper-2)] border border-[var(--paper-edge)] rounded-[var(--r-md)] p-4 mb-6">
                <p className="text-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider mb-1">Your Address</p>
                <p className="font-mono text-[13px] text-[var(--ink-1)] break-all">{publicKey}</p>
              </div>
              <p className="text-[var(--ink-3)] font-secondary text-sm mb-6">
                Redirecting to Dashboard...
              </p>
              <button
                onClick={disconnect}
                className="text-mono text-[11px] text-[var(--ink-4)] hover:text-[var(--rose)] transition-colors uppercase tracking-wider"
              >
                Disconnect
              </button>
            </>
          ) : (
            /* Not Connected State */
            <>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-[var(--ink-1)] tracking-tight mb-4">
                Connect Wallet
              </h1>
              
              <p className="text-[var(--ink-3)] font-secondary text-lg mb-10 leading-relaxed">
                Connect your Stellar wallet to start streaming yield from tokenized real-world assets.
              </p>

              <div className="space-y-4 mb-10">
                <MagneticButton 
                  variant="neo" 
                  className="w-full justify-between px-6 py-4"
                  onClick={handleFreighterConnect}
                >
                  <span className="flex items-center gap-3 font-medium">
                    {connecting ? (
                      <Loader2 size={20} className="animate-spin text-[var(--surge)]" />
                    ) : (
                      <Wallet size={20} className="text-[var(--ink-2)]" />
                    )}
                    {connecting ? 'Connecting...' : 'Freighter'}
                  </span>
                  <ArrowRight size={20} className="text-[var(--ink-4)]" />
                </MagneticButton>

                <div className="relative">
                  <MagneticButton variant="neo" className="w-full justify-between px-6 py-4 opacity-50">
                    <span className="flex items-center gap-3 font-medium">
                      <Wallet size={20} className="text-[var(--ink-3)]" />
                      Albedo
                    </span>
                    <span className="text-mono text-[10px] text-[var(--ink-4)] uppercase">Coming Soon</span>
                  </MagneticButton>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 rounded-[var(--r-md)] bg-[var(--rose-pale)] border border-[var(--rose-pale-2)] flex items-start gap-3 text-left">
                  <AlertCircle size={16} className="text-[var(--rose)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[var(--rose)] font-secondary text-[13px]">{error}</p>
                    {error.includes('not detected') && (
                      <a
                        href="https://www.freighter.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-mono text-[10px] text-[var(--surge)] hover:underline uppercase tracking-wider"
                      >
                        Install Freighter <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-[var(--ink-4)] font-secondary mt-6">
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
