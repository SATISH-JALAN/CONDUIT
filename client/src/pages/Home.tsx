import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { TiltCard } from '@/components/ui/TiltCard';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { SplitText } from '@/components/ui/SplitText';
import { ScrambleText } from '@/components/ui/ScrambleText';
import NumberFlow from '@number-flow/react';
import { ArrowRight, Zap, ShieldCheck, Activity } from 'lucide-react';

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterIntRef = useRef<HTMLSpanElement>(null);
  const counterDecRef = useRef<HTMLSpanElement>(null);
  const pendingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Yield Counter Math
    const P = 10000;
    const APY = 0.0521;
    const r = APY / 365 / 86400;
    const syncTs = Date.now() / 1000;
    let animationFrameId: number;

    const updateCounter = () => {
      const dt = Math.max(0, Date.now() / 1000 - syncTs);
      const vt = Math.max(0, P * (Math.exp(r * dt) - 1));
      const total = P + vt;

      const intPart = Math.floor(total);
      const decPart = (total - intPart).toFixed(6).slice(1);

      if (counterIntRef.current) counterIntRef.current.textContent = '$' + intPart.toLocaleString();
      if (counterDecRef.current) counterDecRef.current.textContent = decPart;
      if (pendingRef.current) pendingRef.current.textContent = '+$' + Math.abs(vt).toFixed(4);

      animationFrameId = requestAnimationFrame(updateCounter);
    };

    updateCounter();

    const ctx = gsap.context(() => {
      // Counter Glow Pulse
      gsap.to('.counter-glow', {
        opacity: 0.8,
        scale: 1.015,
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
        repeatDelay: 4.6
      });

      // Bento Card Entrance
      gsap.fromTo(
        '.bento-card',
        { y: 48, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.75,
          stagger: 0.15,
          ease: 'power3.out',
          clearProps: 'opacity,transform,visibility',
          scrollTrigger: {
            trigger: '.bento-grid',
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // Floating Counter Card
      gsap.to('.hero-counter-card', {
        y: -12,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    }, containerRef);

    return () => {
      cancelAnimationFrame(animationFrameId);
      ctx.revert();
    };
  }, []);

  return (
    <div className="min-h-screen" ref={containerRef}>
      {/* HERO SECTION */}
      <section className="min-h-screen py-0 max-w-[1280px] mx-auto px-5 md:px-14 flex items-center">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 items-center w-full">
          {/* Left Column */}
          <div className="space-y-5 md:space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[var(--paper-3)] border border-[var(--paper-edge)]">
              <ScrambleText 
                text="REAL-TIME YIELD STREAMING" 
                className="text-mono-caps text-[10px] text-[var(--ink-3)]"
              />
            </div>

            <h1 className="text-[clamp(42px,5vw,72px)] font-display font-[700] leading-[0.92] tracking-[-0.04em] animate-weight">
              <SplitText className="block text-[var(--ink-1)]">Your money.</SplitText>
              <SplitText className="block text-[var(--surge)]" delay={0.1}>Streaming.</SplitText>
              <SplitText className="block text-[40%] font-secondary italic font-light text-[var(--ink-3)] leading-[1.16] mt-2 pb-[0.16em]" delay={0.2}>
                every second.
              </SplitText>
            </h1>

            <p className="font-body text-[15px] font-light text-[var(--ink-2)] leading-[1.7] max-w-[440px]">
              Deposit into tokenized government bonds. Watch a live counter tick upward every second. Split your yield stream. COND manages it all. Built on Stellar — $0.00001 per transaction.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-0">
              <Link to="/bonds" className="w-full sm:w-auto">
                <MagneticButton variant="primary" className="w-full sm:w-auto justify-center font-display text-[16px] px-[36px] py-[14px] rounded-[var(--r-lg)] hover:shadow-[0_0_20px_rgba(0,122,94,0.4)] transition-all">
                  Start Earning <ArrowRight className="inline-block ml-2" size={16} />
                </MagneticButton>
              </Link>
              <Link to="/onboarding" className="w-full sm:w-auto">
                <MagneticButton className="w-full sm:w-auto justify-center bg-[var(--paper-2)] text-[var(--ink-2)] font-display text-[16px] px-[36px] py-[14px] rounded-[var(--r-lg)] hover:bg-[var(--paper-3)] transition-all shadow-[0_2px_4px_var(--paper-shadow)]">
                  Watch Demo
                </MagneticButton>
              </Link>
            </div>

            {/* Trust Strip */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 pt-4 border-t border-[var(--paper-edge)] mt-4">
              <div>
                <div className="font-display text-[22px] text-[var(--surge)] font-medium">
                  <NumberFlow value={140} format={{ style: 'currency', currency: 'USD', notation: 'compact' }} />T
                </div>
                <div className="font-secondary text-[10px] text-[var(--ink-4)] uppercase tracking-wider">Global Bond Market</div>
              </div>
              <div>
                <div className="font-display text-[22px] text-[var(--surge)] font-medium">
                  <NumberFlow value={1} format={{ style: 'currency', currency: 'USD', notation: 'compact' }} />B+
                </div>
                <div className="font-secondary text-[10px] text-[var(--ink-4)] uppercase tracking-wider">Stellar RWA</div>
              </div>
                <div>
                  <div className="font-display text-[22px] text-[var(--surge)] font-medium">
                    <NumberFlow value={0.0521} format={{ style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                  </div>
                  <div className="font-secondary text-[10px] text-[var(--ink-4)] uppercase tracking-wider">APY</div>
                </div>
            </div>
          </div>

          {/* Right Column - Counter Card */}
          <div className="relative hero-counter-card">
            <div className="counter-glow absolute inset-0 bg-[var(--surge-pale)] rounded-full filter blur-[100px] opacity-50" />
            
            <TiltCard className="chrome-border chrome-spinning paper-card-elevated p-[28px] relative z-10 overflow-hidden">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-6 md:mb-8">
                <div className="text-mono text-[9px] md:text-[10px] text-[var(--ink-4)]">DEMO · $10,000 AT 5.21% APY</div>
                <div className="flex items-center gap-2 text-mono text-[9px] text-[var(--surge)]">
                  <span className="dot-live"></span> Virtual Accrual
                </div>
              </div>

              <div className="mb-2 flex items-baseline">
                <span ref={counterIntRef} className="font-display text-[clamp(32px,4vw,52px)] font-bold text-[var(--ink-1)] tabular-nums tracking-[-0.04em] leading-none">$10,000</span>
                <span ref={counterDecRef} className="font-mono text-[clamp(20px,2.8vw,34px)] text-[var(--surge)] tabular-nums leading-none">.000000</span>
              </div>
              
              <div className="text-mono text-[12px] text-[var(--surge)] opacity-70 mb-8">
                +$0.000016 / second
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-mono text-[10px] text-[var(--ink-4)] mb-2 uppercase">
                  <span>Streaming</span>
                  <span ref={pendingRef}>+$0.0000</span>
                </div>
                <div className="h-[3px] bg-[var(--paper-3)] rounded-full overflow-hidden">
                  <div className="stream-bar-fill"></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4 border-t border-[var(--paper-edge)] pt-6">
                <div className="border-r border-[var(--paper-edge)]">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1">Pending</div>
                  <div className="font-display text-[16px] md:text-[18px] text-[var(--ink-1)] font-medium">$14.20</div>
                </div>
                <div className="border-r border-[var(--paper-edge)] pl-4">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1">APY</div>
                  <div className="font-display text-[16px] md:text-[18px] text-[var(--ink-1)] font-medium">5.21%</div>
                </div>
                <div className="pl-4">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1">Daily</div>
                  <div className="font-display text-[16px] md:text-[18px] text-[var(--ink-1)] font-medium">$1.42</div>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* AMBIENT CONTEXT STRIP */}
      <div className="w-full bg-[var(--paper-2)] border-y border-[var(--paper-edge)] overflow-hidden py-3">
        <div className="flex whitespace-nowrap animate-[stream-flow_20s_linear_infinite] text-mono text-[11px] tracking-wider">
          <span className="mx-8 text-[var(--amber)]">BENJI 4.5%</span>
          <span className="mx-8 text-[var(--sky)]">USDY 5.10%</span>
          <span className="mx-8 text-[var(--ink-3)]">Stellar TVL $1B+</span>
          <span className="mx-8 text-[var(--surge)]">XLM $0.00001/tx</span>
          <span className="mx-8 text-[var(--violet)]">Protocol 23 Active</span>
          <span className="mx-8 text-[var(--ink-1)] font-medium">Conduit Testnet Live</span>
          {/* Duplicate for seamless loop */}
          <span className="mx-8 text-[var(--amber)]">BENJI 4.5%</span>
          <span className="mx-8 text-[var(--sky)]">USDY 5.10%</span>
          <span className="mx-8 text-[var(--ink-3)]">Stellar TVL $1B+</span>
          <span className="mx-8 text-[var(--surge)]">XLM $0.00001/tx</span>
          <span className="mx-8 text-[var(--violet)]">Protocol 23 Active</span>
          <span className="mx-8 text-[var(--ink-1)] font-medium">Conduit Testnet Live</span>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="py-[80px] md:py-[120px] max-w-[1280px] mx-auto px-6 md:px-14">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-16">
          <div>
            <div className="section-eyebrow inline-block px-3 py-1 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] mb-4">
              <ScrambleText text="HOW IT WORKS" className="text-mono-caps text-[10px] text-[var(--ink-3)]" />
            </div>
            <h2 className="heading text-[clamp(36px,4vw,64px)] font-display font-bold tracking-[-0.03em] leading-none">
              <SplitText>The mechanics of</SplitText>
              <SplitText className="text-[var(--surge)]">continuous yield.</SplitText>
            </h2>
          </div>
          <p className="font-body text-[16px] font-light text-[var(--ink-3)] leading-[1.7] max-w-[400px] md:justify-self-end">
            Traditional bonds pay out semi-annually. We tokenize them on Stellar and stream the accrued interest to your wallet every 5 seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-2 grid-rows-[auto_auto] gap-6 bento-grid">
          {/* Featured Step */}
          <SpotlightCard className="bento-card paper-card-elevated md:row-span-2 p-8 relative flex flex-col justify-between min-h-[400px]">
            <div className="absolute top-4 right-4 font-display text-[100px] font-bold text-[var(--ink-1)] opacity-5 leading-none select-none">01</div>
            <div>
              <div className="w-[48px] h-[48px] bg-[var(--paper-3)] rounded-[var(--r-md)] flex items-center justify-center mb-6 shadow-[0_2px_4px_var(--paper-shadow)] border border-[var(--paper-edge)]">
                <Zap size={24} className="text-[var(--surge)]" />
              </div>
              <h3 className="font-display text-[22px] font-semibold text-[var(--ink-1)] tracking-[-0.02em] mb-3">Deposit USDC</h3>
              <p className="font-secondary text-[15px] font-light text-[var(--ink-2)] leading-[1.7]">
                Convert your stablecoins into tokenized treasury bills. Your principal is secured by audited smart contracts and real-world custodians.
              </p>
            </div>
            <div className="mt-8 bg-[var(--paper-0)] border border-[var(--paper-edge)] rounded-[var(--r-sm)] p-[14px] font-mono text-[11px] text-[var(--surge)]">
              <code>await conduit.deposit({'{'} amount: 10000, asset: 'USDC' {'}'})</code>
            </div>
          </SpotlightCard>

          {/* Step 2 */}
          <SpotlightCard className="bento-card paper-card p-6 relative hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-500">
            <div className="absolute top-4 right-4 font-display text-[60px] font-bold text-[var(--ink-1)] opacity-5 leading-none select-none">02</div>
            <div className="w-[40px] h-[40px] bg-[var(--paper-3)] rounded-[var(--r-sm)] flex items-center justify-center mb-4 border border-[var(--paper-edge)]">
              <Activity size={20} className="text-[var(--amber)]" />
            </div>
            <h3 className="font-display text-[18px] font-semibold text-[var(--ink-1)] tracking-[-0.02em] mb-2">Accrue Every Second</h3>
            <p className="font-secondary text-[14px] font-light text-[var(--ink-2)] leading-[1.6]">
              Interest is calculated continuously. Watch your balance grow in real-time.
            </p>
          </SpotlightCard>

          {/* Step 3 */}
          <SpotlightCard className="bento-card paper-card p-6 relative hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-500">
            <div className="absolute top-4 right-4 font-display text-[60px] font-bold text-[var(--ink-1)] opacity-5 leading-none select-none">03</div>
            <div className="w-[40px] h-[40px] bg-[var(--paper-3)] rounded-[var(--r-sm)] flex items-center justify-center mb-4 border border-[var(--paper-edge)]">
              <ShieldCheck size={20} className="text-[var(--sky)]" />
            </div>
            <h3 className="font-display text-[18px] font-semibold text-[var(--ink-1)] tracking-[-0.02em] mb-2">Harvest Anytime</h3>
            <p className="font-secondary text-[14px] font-light text-[var(--ink-2)] leading-[1.6]">
              Claim your yield instantly to your wallet. No lockups, no penalties.
            </p>
          </SpotlightCard>
        </div>
      </section>

      {/* BOND BOXES */}
      <section className="py-[40px] md:py-[80px] max-w-[1280px] mx-auto px-5 md:px-14">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-14">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] mb-4">
              <ScrambleText text="BOND BOXES" className="text-mono-caps text-[10px] text-[var(--ink-3)]" />
            </div>
            <h2 className="text-[clamp(34px,4vw,62px)] font-display font-bold tracking-[-0.03em] leading-none">
              Curated boxes for
              <span className="block text-[var(--surge)]">every market mood.</span>
            </h2>
          </div>
          <p className="font-body text-[16px] font-light text-[var(--ink-3)] leading-[1.7] max-w-[420px] md:justify-self-end">
            Pick a strategy box, stream returns in real-time, and rebalance as conditions shift.
          </p>
        </div>

        <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 bento-grid">
          <SpotlightCard className="bento-card paper-card-elevated md:row-span-2 p-8 border-t-[2px] border-[var(--surge)] flex flex-col justify-between">
            <div>
              <div className="text-mono text-[10px] tracking-[0.12em] text-[var(--ink-4)] mb-5 uppercase">Featured</div>
              <h3 className="font-display text-[34px] tracking-[-0.03em] leading-none text-[var(--ink-1)] mb-4">All Weather</h3>
              <p className="font-secondary text-[15px] text-[var(--ink-2)] leading-[1.65] max-w-[360px]">
                Balanced duration and issuer mix designed to stay steady through rate pivots and volatility.
              </p>
            </div>
            <div className="pt-8 border-t border-[var(--paper-edge)]">
              <div className="font-display text-[72px] leading-[0.9] tracking-[-0.04em] text-[var(--surge)]">5.6%</div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mt-2">Current APY</div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-[2px] border-[var(--sky)]">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Safe Harbor</h3>
            <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Short duration, lower volatility exposure.</p>
            <div className="font-display text-[38px] tracking-[-0.03em] text-[var(--sky)]">4.8%</div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-[2px] border-[var(--amber)]">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Yield Max</h3>
            <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Higher duration for stronger carry potential.</p>
            <div className="font-display text-[38px] tracking-[-0.03em] text-[var(--amber)]">7.1%</div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-[2px] border-[var(--violet)]">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">COND Custom</h3>
            <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Agent-generated allocation and timing.</p>
            <div className="font-display text-[34px] tracking-[-0.03em] text-[var(--violet)]">Variable</div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-[2px] border-[var(--rose)]">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Fixed Lock</h3>
            <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Term-based vault with protected payout profile.</p>
            <div className="font-display text-[34px] tracking-[-0.03em] text-[var(--rose)]">Guaranteed</div>
          </SpotlightCard>
        </div>
      </section>

      {/* COND SECTION */}
      <section className="py-[40px] md:py-[90px] max-w-[1280px] mx-auto px-5 md:px-14">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="paper-card-elevated bg-[var(--paper-0)] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)]">cond.live.log</span>
            </div>
            <div className="space-y-3 font-mono text-[12px] leading-[1.7] break-words">
              <div><span className="text-[var(--sky)]">OBSERVE</span>  :: BENJI spread tightened 14bps</div>
              <div><span className="text-[var(--amber)]">REASON</span>   :: rotate 18% into short-duration sky box</div>
              <div><span className="text-[var(--surge)]">EXECUTE</span>  :: rebalance(tx#A91F) + stream update</div>
              <div><span className="text-[rgba(0,122,94,0.7)]">LOG</span>      :: kill switch armed, latency stable at 42ms</div>
              <div><span className="text-[var(--sky)]">OBSERVE</span>  :: inflow spike from @satish_conduit vault</div>
              <div><span className="text-[var(--amber)]">REASON</span>   :: maintain risk budget, hold custom box</div>
              <div><span className="text-[var(--surge)]">EXECUTE</span>  :: continue stream / no manual action</div>
              <div><span className="text-[rgba(0,122,94,0.7)]">LOG</span>      :: audit trail persisted on-chain</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="paper-card p-6">
              <div className="text-mono text-[10px] text-[var(--ink-4)] mb-2 tracking-[0.12em]">01</div>
              <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Observe</h3>
              <p className="font-secondary text-[14px] text-[var(--ink-2)]">COND monitors rates, liquidity, and user behavior in real-time.</p>
            </div>
            <div className="paper-card p-6">
              <div className="text-mono text-[10px] text-[var(--ink-4)] mb-2 tracking-[0.12em]">02</div>
              <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Reason</h3>
              <p className="font-secondary text-[14px] text-[var(--ink-2)]">Structured CoT logic proposes moves with transparent rationale.</p>
            </div>
            <div className="paper-card p-6">
              <div className="text-mono text-[10px] text-[var(--ink-4)] mb-2 tracking-[0.12em]">03</div>
              <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Execute</h3>
              <p className="font-secondary text-[14px] text-[var(--ink-2)]">Transactions route on Stellar with instant state updates.</p>
            </div>
            <div className="paper-card p-6 bg-[var(--rose-pale)] border-[var(--rose)]/35">
              <h4 className="font-display text-[20px] tracking-[-0.02em] text-[var(--rose)] mb-2">Kill Switch</h4>
              <p className="font-secondary text-[14px] text-[var(--ink-2)]">One tap freezes automated execution while preserving withdrawals and stream visibility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="py-[40px] md:py-[90px] max-w-[1280px] mx-auto px-5 md:px-14">
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start">
          <div className="paper-card-elevated p-6 md:p-8">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-6">Yield Race Leaderboard</div>
            <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--paper-edge)]">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-[var(--paper-2)]">
                  <tr className="text-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-4)]">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Handle</th>
                    <th className="px-4 py-3">Box</th>
                    <th className="px-4 py-3 text-right">APY</th>
                  </tr>
                </thead>
                <tbody className="font-secondary text-[14px] text-[var(--ink-2)]">
                  <tr className="border-t border-[var(--paper-edge)]"><td className="px-4 py-3">🥇</td><td className="px-4 py-3">@atlas_yield</td><td className="px-4 py-3">Yield Max</td><td className="px-4 py-3 text-right text-[var(--amber)]">7.2%</td></tr>
                  <tr className="border-t border-[var(--paper-edge)]"><td className="px-4 py-3">🥈</td><td className="px-4 py-3">@bondsmith</td><td className="px-4 py-3">All Weather</td><td className="px-4 py-3 text-right text-[var(--surge)]">5.9%</td></tr>
                  <tr className="border-t border-[var(--paper-edge)] border-l-[2px] border-l-[#007A5E] bg-[#E8F5F1]"><td className="px-4 py-3">🥉</td><td className="px-4 py-3 font-medium text-[var(--ink-1)]">@satish_conduit</td><td className="px-4 py-3">COND Custom</td><td className="px-4 py-3 text-right text-[var(--surge)]">5.6%</td></tr>
                  <tr className="border-t border-[var(--paper-edge)]"><td className="px-4 py-3">4</td><td className="px-4 py-3">@vaultpilot</td><td className="px-4 py-3">Safe Harbor</td><td className="px-4 py-3 text-right text-[var(--sky)]">4.8%</td></tr>
                  <tr className="border-t border-[var(--paper-edge)]"><td className="px-4 py-3">5</td><td className="px-4 py-3">@fixedalpha</td><td className="px-4 py-3">Fixed Lock</td><td className="px-4 py-3 text-right text-[var(--rose)]">5.1%</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="paper-card-elevated p-6 md:p-8 border-t-[2px] border-t-[var(--rose)]">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Weekend Race</div>
            <div className="font-display text-[46px] md:text-[56px] leading-[0.9] tracking-[-0.03em] text-[var(--ink-1)] mb-2">$4,200</div>
            <div className="font-secondary text-[14px] text-[var(--ink-3)] mb-8">Prize pool for highest streamed yield this round.</div>
            <div className="grid grid-cols-4 gap-3 mb-8">
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">02</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Days</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">18</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Hrs</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">42</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Min</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">09</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Sec</div></div>
            </div>
            <MagneticButton variant="primary" className="w-full justify-center font-display text-[16px] py-[14px] rounded-[var(--r-md)]">
              Join Race
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-[56px] md:py-[76px] border-t border-[var(--paper-edge)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--paper-2)] -z-20" />
        <div className="absolute left-1/2 top-[32%] -translate-x-1/2 w-[360px] h-[240px] md:w-[600px] md:h-[400px] bg-[radial-gradient(ellipse,rgba(0,122,94,0.04),transparent_70%)] pointer-events-none -z-10" />
        
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <h2 className="heading text-[clamp(30px,4.4vw,64px)] font-display font-[700] tracking-[-0.04em] leading-[1] text-center mb-8 md:mb-10">
            <SplitText className="block text-[var(--ink-1)]">The bond market has</SplitText>
            <SplitText className="block text-[var(--ink-4)]">been</SplitText>
            <SplitText className="block text-[var(--ink-1)]">boring for 300 years.</SplitText>
            <SplitText className="block text-[#007A5E]">Not anymore.</SplitText>
          </h2>

          <Link to="/bonds" className="inline-flex justify-center">
            <MagneticButton variant="primary" className="font-display text-[16px] md:text-[18px] px-[36px] md:px-[48px] py-[14px] md:py-[18px] rounded-[var(--r-full)] hover:shadow-[0_0_24px_rgba(0,122,94,0.45)] hover:-translate-y-1 transition-all">
              Start Earning <ArrowRight className="inline-block ml-2" size={20} />
            </MagneticButton>
          </Link>
          
          <div className="mt-8 md:mt-10 text-mono-caps text-[10px] text-[var(--ink-4)] tracking-[0.14em]">
            Built on Stellar · Soroban Contracts · BENJI + USDY Live · Non-custodial
          </div>
        </div>
      </section>
    </div>
  );
}
