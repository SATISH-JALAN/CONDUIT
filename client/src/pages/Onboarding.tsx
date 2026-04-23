import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Wallet, ShieldCheck, ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '@/stores/walletStore';
import { TrustInfoCard } from '@/components/ui/TrustInfoCard';
import { cn } from '@/lib/utils';

export function Onboarding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { connect, connecting, isConnected, publicKey, error, disconnect } = useWalletStore();
  const [verified, setVerified] = React.useState(false);

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
      const verifyTimer = setTimeout(() => setVerified(true), 500);
      const navTimer = setTimeout(() => navigate('/dashboard'), 1500);
      return () => {
        clearTimeout(verifyTimer);
        clearTimeout(navTimer);
      };
    } else {
      setVerified(false);
    }
  }, [isConnected, publicKey, navigate]);

  const handleFreighterConnect = async () => {
    await connect();
  };

  return (
    <div className="min-h-screen pt-32 pb-24 flex items-center justify-center" ref={containerRef}>
      <div className="container mx-auto px-6 max-w-lg">
        <GlassCard variant="elevated" className="p-10 text-center onboard-item">
          {/* Step Wizard */}
          <div className="flex justify-between items-center mb-10 relative px-4">
            <div className="absolute top-5 left-10 right-10 h-[1px] bg-(--paper-edge) -z-10" />
            
            {[
              { id: 1, label: 'Check', state: isConnected || error ? 'completed' : 'active' },
              { id: 2, label: 'Connect', state: isConnected ? 'completed' : connecting ? 'active' : 'pending' },
              { id: 3, label: 'Verify', state: verified ? 'completed' : isConnected ? 'active' : 'pending' }
            ].map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center gap-2 px-2 z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors text-sm font-medium",
                  step.state === 'completed' ? "bg-(--surge) border-(--surge) text-white" :
                  step.state === 'active' ? "bg-(--paper-1) border-(--surge) text-(--surge)" :
                  "bg-(--paper-1) border-(--paper-edge) text-(--ink-4)"
                )}>
                  {step.state === 'completed' ? <CheckCircle size={18} /> : step.id}
                </div>
                <span className={cn(
                  "text-[10px] font-mono uppercase tracking-wider",
                  step.state === 'pending' ? "text-(--ink-4)" : "text-(--ink-1)"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="w-20 h-20 mx-auto rounded-full bg-(--surge-pale) flex items-center justify-center text-(--surge) mb-8 shadow-inner border border-(--surge-pale-2)">
            {isConnected ? <CheckCircle size={40} /> : <Wallet size={40} />}
          </div>

          {isConnected && publicKey ? (
            /* Connected State */
            <>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-(--ink-1) tracking-tight mb-4">
                Wallet Connected!
              </h1>
              <div className="bg-(--paper-2) border border-(--paper-edge) rounded-(--r-md) p-4 mb-6">
                <p className="text-mono text-[11px] text-(--ink-4) uppercase tracking-wider mb-1">Your Address</p>
                <p className="font-mono text-[13px] text-(--ink-1) break-all">{publicKey}</p>
              </div>
              <p className="text-(--ink-3) font-secondary text-sm mb-6">
                Redirecting to Dashboard...
              </p>
              <button
                onClick={disconnect}
                className="text-mono text-[11px] text-(--ink-4) hover:text-(--rose) transition-colors uppercase tracking-wider"
              >
                Disconnect
              </button>
            </>
          ) : (
            /* Not Connected State */
            <>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-(--ink-1) tracking-tight mb-4">
                Connect Wallet
              </h1>

              <p className="text-(--ink-3) font-secondary text-lg mb-10 leading-relaxed">
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
                      <Loader2 size={20} className="animate-spin text-(--surge)" />
                    ) : (
                      <Wallet size={20} className="text-(--ink-2)" />
                    )}
                    {connecting ? 'Connecting...' : 'Freighter'}
                  </span>
                  <ArrowRight size={20} className="text-(--ink-4)" />
                </MagneticButton>

                <div className="relative">
                  <MagneticButton variant="neo" className="w-full justify-between px-6 py-4 opacity-50">
                    <span className="flex items-center gap-3 font-medium">
                      <Wallet size={20} className="text-(--ink-3)" />
                      Albedo
                    </span>
                    <span className="text-mono text-[10px] text-(--ink-4) uppercase">Coming Soon</span>
                  </MagneticButton>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 rounded-(--r-md) bg-(--rose-pale) border border-(--rose-pale-2) flex items-start gap-3 text-left">
                  <AlertCircle size={16} className="text-(--rose) mt-0.5 shrink-0" />
                  <div>
                    <p className="text-(--rose) font-secondary text-[13px]">{error}</p>
                    {error.includes('not detected') && (
                      <a
                        href="https://www.freighter.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-mono text-[10px] text-(--surge) hover:underline uppercase tracking-wider"
                      >
                        Install Freighter <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-8 text-left">
            <TrustInfoCard />
          </div>
        </GlassCard>

        <div className="mt-8 text-center onboard-item">
          <Link to="/" className="text-(--ink-3) hover:text-(--surge) transition-colors font-secondary text-sm">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
