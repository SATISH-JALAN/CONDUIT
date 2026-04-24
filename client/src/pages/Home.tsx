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
import { calculateValue } from '@/lib/formula';
import { useRaceStore } from '@/stores/raceStore';
import { useWalletStore } from '@/stores/walletStore';
import { HeroParticles } from '@/components/ui/HeroParticles';

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterIntRef = useRef<HTMLSpanElement>(null);
  const counterDecRef = useRef<HTMLSpanElement>(null);
  const pendingRef = useRef<HTMLSpanElement>(null);
  const { leaderboard, fetchLeaderboard, loading } = useRaceStore();
  const { isConnected } = useWalletStore();

  useEffect(() => {
    // Yield Counter Math using shared formula
    const anchor = {
      principal: 10000,
      apy_bps: 521, // 5.21%
      sync_ts: Date.now() / 1000,
      box_id: 'demo',
    };
    
    let animationFrameId: number;

    const updateCounter = () => {
      const total = calculateValue(anchor);
      const vt = total - anchor.principal;

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

  useEffect(() => {
    void fetchLeaderboard('7d', 5);
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen overflow-x-hidden" ref={containerRef}>
      {/* HERO SECTION */}
      <section className="min-h-screen pt-22 pb-8 md:pt-24 md:pb-0 relative flex items-center">
        {/* INTERACTIVE ANTIGRAVITY PARTICLES */}
        <div className="absolute inset-0 z-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
          <HeroParticles key="monochrome-grid-v2" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-14 grid lg:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 items-center w-full relative z-10">
          {/* Left Column */}
          <div className="space-y-5 md:space-y-6 relative z-10">


            <div className="inline-block px-4 py-1.5 rounded-full bg-(--paper-3) border border-(--paper-edge)">
              <ScrambleText 
                text="REAL-TIME YIELD STREAMING" 
                className="text-mono-caps text-[10px] text-(--ink-3)"
              />
            </div>

            <h1 className="text-[clamp(42px,5vw,72px)] font-display font-bold leading-[1] tracking-[-0.04em] animate-weight relative">
              <SplitText className="block text-(--ink-1) pb-1">Your money.</SplitText>
              <div className="relative inline-block pb-4">
                {/* Fixed the 'g' cutoff by adding bottom padding, leading adjustment, and a container */}
                <SplitText className="block text-(--surge) relative z-10" delay={0.1}>Streaming.</SplitText>
                {/* Underline swoosh graphic */}
                <div className="absolute -bottom-1 left-0 w-full h-[6px] bg-(--surge-pale) rounded-full transform scale-x-0 origin-left animate-[scale-x_1s_ease-out_0.5s_forwards] z-10" />
              </div>
            </h1>

            <p className="font-body text-[16px] font-light text-(--ink-2) leading-[1.7] max-w-110 md:text-[18px]">
              Deposit into tokenized government bonds. Watch a live counter tick upward every second. Split your yield stream. COND manages it all. Built on Stellar - $0.00001 per transaction.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <Link to={isConnected ? "/bonds" : "/onboarding"} className="w-full sm:w-auto">
                <MagneticButton variant="primary" className="w-full sm:w-auto justify-center font-display text-[16px] px-9 py-3.5 rounded-(--r-lg) hover:shadow-[0_0_20px_rgba(0,122,94,0.4)] transition-all">
                  {isConnected ? "Start Earning" : "Connect Wallet"} <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                </MagneticButton>
              </Link>
              <button onClick={() => window.open('https://youtube.com', '_blank')} className="w-full sm:w-auto">
                <MagneticButton className="w-full sm:w-auto justify-center bg-transparent border border-(--paper-edge) text-(--ink-2) font-display text-[16px] px-9 py-3.5 rounded-(--r-lg) hover:bg-(--paper-2) hover:text-(--surge) transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-(--surge-pale) flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-(--surge) border-b-[4px] border-b-transparent ml-0.5"></div>
                    </div>
                    Watch Demo
                  </div>
                </MagneticButton>
              </button>
            </div>

            {/* Trust Strip */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 pt-6 border-t border-(--paper-edge) mt-6">
              <div className="relative group cursor-default">
                <div className="absolute -inset-2 bg-gradient-to-r from-(--surge-pale) to-transparent opacity-0 group-hover:opacity-20 rounded-lg blur-md transition-opacity"></div>
                <div className="font-display text-[24px] text-(--surge) font-medium flex items-center gap-1">
                  <NumberFlow value={342} />+
                </div>
                <div className="font-secondary text-[10px] text-(--ink-4) uppercase tracking-wider flex items-center gap-1 mt-1">
                  Active Users
                </div>
              </div>
              <div className="relative group cursor-default">
                <div className="absolute -inset-2 bg-gradient-to-r from-(--violet-pale) to-transparent opacity-0 group-hover:opacity-20 rounded-lg blur-md transition-opacity"></div>
                <div className="font-display text-[24px] text-(--ink-1) font-medium flex items-center gap-1 group-hover:text-(--violet) transition-colors">
                  <NumberFlow value={12.4} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />k
                </div>
                <div className="font-secondary text-[10px] text-(--ink-4) uppercase tracking-wider flex items-center gap-1 mt-1">
                  Total Transactions
                </div>
              </div>
              <div className="relative group cursor-default">
                <div className="absolute -inset-2 bg-gradient-to-r from-(--amber-pale) to-transparent opacity-0 group-hover:opacity-20 rounded-lg blur-md transition-opacity"></div>
                <div className="font-display text-[24px] text-(--ink-1) font-medium flex items-center gap-1 group-hover:text-(--amber) transition-colors">
                  4.5% - 7.1%
                </div>
                <div className="font-secondary text-[10px] text-(--ink-4) uppercase tracking-wider flex items-center gap-1 mt-1">
                  Current APY Range
                </div>
              </div>
            </div>

            {/* Trust Infrastructure Row */}
            <div className="pt-6 mt-6 border-t border-(--paper-edge) flex flex-wrap items-center gap-4 md:gap-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
              <div className="text-mono text-[10px] text-(--ink-4) tracking-wider uppercase">Powered By</div>
              <div className="flex flex-wrap gap-3 md:gap-4 items-center font-display font-medium text-[13px] md:text-[14px] text-(--ink-2)">
                <span>Stellar</span>
                <span className="text-(--ink-4)">•</span>
                <span>Soroban</span>
                <span className="text-(--ink-4)">•</span>
                <span>Franklin Templeton</span>
                <span className="text-(--ink-4)">•</span>
                <span>Ondo</span>
              </div>
            </div>
          </div>

          {/* Right Column - Counter Card */}
          <div className="relative hero-counter-card">
            {/* Subtle glow behind the card */}
            <div className="absolute inset-2 bg-(--surge) rounded-[40px] filter blur-[80px] opacity-[0.40]" />
            
            <TiltCard className="chrome-border chrome-spinning paper-card-elevated p-7 md:p-9 relative z-10 overflow-hidden">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-6 md:mb-8">
                <div className="text-mono text-[9px] md:text-[10px] text-(--ink-4)">DEMO - $10,000 AT 5.21% APY</div>
                <div className="flex items-center gap-2 text-mono text-[9px] text-(--surge)">
                  <span className="dot-live"></span> Virtual Accrual
                </div>
              </div>

              <div className="mb-2 flex items-baseline">
                <span ref={counterIntRef} className="font-display text-[clamp(32px,4vw,52px)] font-bold text-(--ink-1) tabular-nums tracking-[-0.04em] leading-none">$10,000</span>
                <span ref={counterDecRef} className="font-mono text-[clamp(20px,2.8vw,34px)] text-(--surge) tabular-nums leading-none">.000000</span>
              </div>
              
              <div className="text-mono text-[12px] text-(--surge) opacity-70 mb-8">
                +$0.000016 / second
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-mono text-[10px] text-(--ink-4) mb-2 uppercase">
                  <span>Streaming</span>
                  <span ref={pendingRef}>+$0.0000</span>
                </div>
                <div className="h-0.75 bg-(--paper-3) rounded-full overflow-hidden">
                  <div className="stream-bar-fill"></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4 border-t border-(--paper-edge) pt-6">
                <div className="border-r border-(--paper-edge)">
                  <div className="text-mono text-[9px] text-(--ink-4) uppercase mb-1">Pending</div>
                  <div className="font-display text-[16px] md:text-[18px] text-(--ink-1) font-medium">$14.20</div>
                </div>
                <div className="border-r border-(--paper-edge) pl-4">
                  <div className="text-mono text-[9px] text-(--ink-4) uppercase mb-1">APY</div>
                  <div className="font-display text-[16px] md:text-[18px] text-(--ink-1) font-medium">5.21%</div>
                </div>
                <div className="pl-4">
                  <div className="text-mono text-[9px] text-(--ink-4) uppercase mb-1">Daily</div>
                  <div className="font-display text-[16px] md:text-[18px] text-(--ink-1) font-medium">$1.42</div>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* AMBIENT CONTEXT STRIP */}
      <div className="w-full bg-(--paper-2) border-y border-(--paper-edge) overflow-hidden py-3">
        <div className="flex whitespace-nowrap animate-[stream-flow_20s_linear_infinite] text-mono text-[11px] tracking-wider">
          <span className="mx-8 text-(--amber)">BENJI 4.5%</span>
          <span className="mx-8 text-(--sky)">USDY 5.10%</span>
          <span className="mx-8 text-(--ink-3)">Stellar TVL $1B+</span>
          <span className="mx-8 text-(--surge)">XLM $0.00001/tx</span>
          <span className="mx-8 text-(--violet)">Protocol 23 Active</span>
          <span className="mx-8 text-(--ink-1) font-medium">Conduit Testnet Live</span>
          {/* Duplicate for seamless loop */}
          <span className="mx-8 text-(--amber)">BENJI 4.5%</span>
          <span className="mx-8 text-(--sky)">USDY 5.10%</span>
          <span className="mx-8 text-(--ink-3)">Stellar TVL $1B+</span>
          <span className="mx-8 text-(--surge)">XLM $0.00001/tx</span>
          <span className="mx-8 text-(--violet)">Protocol 23 Active</span>
          <span className="mx-8 text-(--ink-1) font-medium">Conduit Testnet Live</span>
        </div>
      </div>

      {/* START IN 60 SECONDS */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-6 md:px-14 border-b border-(--paper-edge)">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(28px,3vw,42px)] font-display font-bold tracking-[-0.03em] text-(--ink-1) mb-4">
            Start earning in <span className="text-(--surge)">60 seconds</span>.
          </h2>
          <p className="font-secondary text-[16px] text-(--ink-3) max-w-lg mx-auto">
            From zero to streaming yield, completely non-custodial and secure.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-(--paper-edge) -translate-y-1/2 -z-10" />
          
          {[
            { step: '01', title: 'Connect Wallet', desc: 'Securely link your Freighter wallet. No signups required.' },
            { step: '02', title: 'Choose Bond', desc: 'Select from curated RWA boxes like USDY or BENJI.' },
            { step: '03', title: 'Sign & Stream', desc: 'Sign the transaction and watch your yield accrue live.' },
          ].map((item, idx) => (
            <div key={item.step} className="paper-card p-6 text-center bg-(--paper-0) relative">
              <div className="w-12 h-12 mx-auto bg-(--paper-2) rounded-full flex items-center justify-center font-display text-[20px] font-medium text-(--surge) mb-4 border border-(--surge-pale-2) shadow-sm">
                {idx + 1}
              </div>
              <h3 className="font-display text-[20px] font-medium text-(--ink-1) mb-2">{item.title}</h3>
              <p className="font-secondary text-[14px] text-(--ink-3)">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 md:py-30 max-w-7xl mx-auto px-6 md:px-14">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-16">
          <div>
            <div className="section-eyebrow inline-block px-3 py-1 rounded-full bg-(--paper-2) border border-(--paper-edge) mb-4">
              <ScrambleText text="HOW IT WORKS" className="text-mono-caps text-[10px] text-(--ink-3)" />
            </div>
            <h2 className="heading text-[clamp(36px,4vw,64px)] font-display font-bold tracking-[-0.03em] leading-none">
              <SplitText>The mechanics of</SplitText>
              <SplitText className="text-(--surge)">continuous yield.</SplitText>
            </h2>
          </div>
          <p className="font-body text-[16px] font-light text-(--ink-3) leading-[1.7] max-w-100 md:justify-self-end">
            Traditional bonds pay out semi-annually. We tokenize them on Stellar and stream the accrued interest to your wallet every 5 seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-2 grid-rows-[auto_auto] gap-6 bento-grid">
          {/* Featured Step */}
          <SpotlightCard className="bento-card paper-card-elevated md:row-span-2 p-8 relative flex flex-col justify-between min-h-100">
            <div className="absolute top-4 right-4 font-display text-[100px] font-bold text-(--ink-1) opacity-5 leading-none select-none">01</div>
            <div>
              <div className="w-12 h-12 bg-(--paper-3) rounded-(--r-md) flex items-center justify-center mb-6 shadow-[0_2px_4px_var(--paper-shadow)] border border-(--paper-edge)">
                <Zap size={24} className="text-(--surge)" />
              </div>
              <h3 className="font-display text-[22px] font-semibold text-(--ink-1) tracking-[-0.02em] mb-3">Deposit USDC</h3>
              <p className="font-secondary text-[15px] font-light text-(--ink-2) leading-[1.7]">
                Convert your stablecoins into tokenized treasury bills. Your principal is secured by audited smart contracts and real-world custodians.
              </p>
            </div>
            <div className="mt-8 bg-(--paper-0) border border-(--paper-edge) rounded-(--r-sm) p-3.5 font-mono text-[11px] text-(--surge)">
              <code>await conduit.deposit({'{'} amount: 10000, asset: 'USDC' {'}'})</code>
            </div>
          </SpotlightCard>

          {/* Step 2 */}
          <SpotlightCard className="bento-card paper-card p-6 relative hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-500">
            <div className="absolute top-4 right-4 font-display text-[60px] font-bold text-(--ink-1) opacity-5 leading-none select-none">02</div>
            <div className="w-10 h-10 bg-(--paper-3) rounded-(--r-sm) flex items-center justify-center mb-4 border border-(--paper-edge)">
              <Activity size={20} className="text-(--amber)" />
            </div>
            <h3 className="font-display text-[18px] font-semibold text-(--ink-1) tracking-[-0.02em] mb-2">Accrue Every Second</h3>
            <p className="font-secondary text-[14px] font-light text-(--ink-2) leading-[1.6]">
              Interest is calculated continuously. Watch your balance grow in real-time.
            </p>
          </SpotlightCard>

          {/* Step 3 */}
          <SpotlightCard className="bento-card paper-card p-6 relative hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-500">
            <div className="absolute top-4 right-4 font-display text-[60px] font-bold text-(--ink-1) opacity-5 leading-none select-none">03</div>
            <div className="w-10 h-10 bg-(--paper-3) rounded-(--r-sm) flex items-center justify-center mb-4 border border-(--paper-edge)">
              <ShieldCheck size={20} className="text-(--sky)" />
            </div>
            <h3 className="font-display text-[18px] font-semibold text-(--ink-1) tracking-[-0.02em] mb-2">Harvest Anytime</h3>
            <p className="font-secondary text-[14px] font-light text-(--ink-2) leading-[1.6]">
              Claim your yield instantly to your wallet. No lockups, no penalties.
            </p>
          </SpotlightCard>
        </div>
      </section>

      {/* BOND BOXES */}
      <section className="py-10 md:py-20 max-w-7xl mx-auto px-5 md:px-14">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-14">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-(--paper-2) border border-(--paper-edge) mb-4">
              <ScrambleText text="BOND BOXES" className="text-mono-caps text-[10px] text-(--ink-3)" />
            </div>
            <h2 className="text-[clamp(34px,4vw,62px)] font-display font-bold tracking-[-0.03em] leading-none">
              Curated boxes for
              <span className="block text-(--surge)">every market mood.</span>
            </h2>
          </div>
          <p className="font-body text-[16px] font-light text-(--ink-3) leading-[1.7] max-w-105 md:justify-self-end">
            Pick a strategy box, stream returns in real-time, and rebalance as conditions shift.
          </p>
        </div>

        <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 bento-grid">
          <SpotlightCard className="bento-card paper-card-elevated md:row-span-2 p-8 border-t-2 border-(--surge) flex flex-col justify-between">
            <div>
              <div className="text-mono text-[10px] tracking-[0.12em] text-(--ink-4) mb-5 uppercase">Featured</div>
              <h3 className="font-display text-[34px] tracking-[-0.03em] leading-none text-(--ink-1) mb-4">All Weather</h3>
              <p className="font-secondary text-[15px] text-(--ink-2) leading-[1.65] max-w-90">
                Balanced duration and issuer mix designed to stay steady through rate pivots and volatility.
              </p>
            </div>
            <div className="pt-8 border-t border-(--paper-edge)">
              <div className="font-display text-[72px] leading-[0.9] tracking-[-0.04em] text-(--surge)">5.6%</div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mt-2">Current APY</div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-2 border-(--sky)">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Safe Harbor</h3>
            <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Short duration, lower volatility exposure.</p>
            <div className="font-display text-[38px] tracking-[-0.03em] text-(--sky)">4.8%</div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-2 border-(--amber)">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Yield Max</h3>
            <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Higher duration for stronger carry potential.</p>
            <div className="font-display text-[38px] tracking-[-0.03em] text-(--amber)">7.1%</div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-2 border-(--violet)">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">COND Custom</h3>
            <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Agent-generated allocation and timing.</p>
            <div className="font-display text-[34px] tracking-[-0.03em] text-(--violet)">Variable</div>
          </SpotlightCard>

          <SpotlightCard className="bento-card paper-card p-6 border-t-2 border-(--rose)">
            <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Fixed Lock</h3>
            <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Term-based vault with protected payout profile.</p>
            <div className="font-display text-[34px] tracking-[-0.03em] text-(--rose)">Guaranteed</div>
          </SpotlightCard>
        </div>
      </section>

      {/* COND SECTION */}
      <section className="py-10 md:py-22.5 max-w-7xl mx-auto px-4 md:px-14">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="paper-card-elevated bg-(--paper-0) p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4)">cond.live.log</span>
            </div>
            <div className="space-y-3 font-mono text-[12px] leading-[1.7] wrap-break-word">
              <div><span className="text-(--sky)">OBSERVE</span>  :: BENJI spread tightened 14bps</div>
              <div><span className="text-(--amber)">REASON</span>   :: rotate 18% into short-duration sky box</div>
              <div><span className="text-(--surge)">EXECUTE</span>  :: rebalance(tx#A91F) + stream update</div>
              <div><span className="text-[rgba(0,122,94,0.7)]">LOG</span>      :: kill switch armed, latency stable at 42ms</div>
              <div><span className="text-(--sky)">OBSERVE</span>  :: inflow spike from @satish_conduit vault</div>
              <div><span className="text-(--amber)">REASON</span>   :: maintain risk budget, hold custom box</div>
              <div><span className="text-(--surge)">EXECUTE</span>  :: continue stream / no manual action</div>
              <div><span className="text-[rgba(0,122,94,0.7)]">LOG</span>      :: audit trail persisted on-chain</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="paper-card p-6">
              <div className="text-mono text-[10px] text-(--ink-4) mb-2 tracking-[0.12em]">01</div>
              <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Observe</h3>
              <p className="font-secondary text-[14px] text-(--ink-2)">COND monitors rates, liquidity, and user behavior in real-time.</p>
            </div>
            <div className="paper-card p-6">
              <div className="text-mono text-[10px] text-(--ink-4) mb-2 tracking-[0.12em]">02</div>
              <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Reason</h3>
              <p className="font-secondary text-[14px] text-(--ink-2)">Structured CoT logic proposes moves with transparent rationale.</p>
            </div>
            <div className="paper-card p-6">
              <div className="text-mono text-[10px] text-(--ink-4) mb-2 tracking-[0.12em]">03</div>
              <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Execute</h3>
              <p className="font-secondary text-[14px] text-(--ink-2)">Transactions route on Stellar with instant state updates.</p>
            </div>
            <div className="paper-card p-6 bg-(--rose-pale) border-(--rose)/35">
              <h4 className="font-display text-[20px] tracking-[-0.02em] text-(--rose) mb-2">Kill Switch</h4>
              <p className="font-secondary text-[14px] text-(--ink-2)">One tap freezes automated execution while preserving withdrawals and stream visibility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="py-10 md:py-22.5 max-w-7xl mx-auto px-5 md:px-14">
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start min-w-0">
          <div className="paper-card-elevated p-6 md:p-8 min-w-0">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-6">Yield Race Leaderboard</div>
            <div className="overflow-x-auto max-w-full rounded-(--r-md) border border-(--paper-edge)">
              <table className="w-full min-w-140 text-left">
                <thead className="bg-(--paper-2)">
                  <tr className="text-mono text-[10px] uppercase tracking-[0.08em] text-(--ink-4)">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Handle</th>
                    <th className="px-4 py-3">Box</th>
                    <th className="px-4 py-3 text-right">APY</th>
                  </tr>
                </thead>
                <tbody className="font-secondary text-[14px] text-(--ink-2)">
                  {loading && leaderboard.length === 0 && (
                    <tr className="border-t border-(--paper-edge)">
                      <td colSpan={4} className="px-4 py-4 text-center text-(--ink-3)">Loading leaderboard...</td>
                    </tr>
                  )}

                  {!loading && leaderboard.length === 0 && (
                    <tr className="border-t border-(--paper-edge)">
                      <td colSpan={4} className="px-4 py-4 text-center text-(--ink-3)">No leaderboard data yet. Start the first race from the dashboard.</td>
                    </tr>
                  )}

                  {leaderboard.map((entry) => (
                    <tr key={`${entry.wallet}-${entry.rank}`} className="border-t border-(--paper-edge)">
                      <td className="px-4 py-3">
                        {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : entry.rank === 3 ? '3rd' : entry.rank}
                      </td>
                      <td className="px-4 py-3">{entry.displayName}</td>
                      <td className="px-4 py-3">TVL ${entry.tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={`px-4 py-3 text-right ${entry.rank <= 2 ? 'text-(--amber)' : 'text-(--surge)'}`}>
                        {entry.apy.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="paper-card-elevated p-6 md:p-8 border-t-2 border-t-(--rose) min-w-0 overflow-hidden">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-4">Weekend Race</div>
            <div className="font-display text-[46px] md:text-[56px] leading-[0.9] tracking-[-0.03em] text-(--ink-1) mb-2">$4,200</div>
            <div className="font-secondary text-[14px] text-(--ink-3) mb-8">Prize pool for highest streamed yield this round.</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 min-w-0">
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">02</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Days</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">18</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Hrs</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">42</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Min</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">09</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Sec</div></div>
            </div>
            <MagneticButton variant="primary" className="w-full justify-center font-display text-[16px] py-3.5 rounded-(--r-md)">
              Join Race
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-14 md:py-19 border-t border-(--paper-edge) relative overflow-hidden">
        <div className="absolute inset-0 bg-(--paper-2) -z-20" />
        <div className="absolute left-1/2 top-[32%] -translate-x-1/2 w-90 h-60 md:w-150 md:h-100 bg-[radial-gradient(ellipse,rgba(0,122,94,0.04),transparent_70%)] pointer-events-none -z-10" />
        
        <div className="max-w-190 mx-auto px-4 md:px-6 text-center">
          <h2 className="heading text-[clamp(30px,4.4vw,64px)] font-display font-bold tracking-[-0.04em] leading-none text-center mb-8 md:mb-10">
            <SplitText className="block text-(--ink-1)">The bond market has</SplitText>
            <SplitText className="block text-(--ink-4)">been</SplitText>
            <SplitText className="block text-(--ink-1)">boring for 300 years.</SplitText>
            <SplitText className="block text-[#007A5E]">Not anymore.</SplitText>
          </h2>

          <Link to="/bonds" className="inline-flex justify-center">
            <MagneticButton variant="primary" className="font-display text-[16px] md:text-[18px] px-9 md:px-12 py-3.5 md:py-4.5 rounded-(--r-full) hover:shadow-[0_0_24px_rgba(0,122,94,0.45)] hover:-translate-y-1 transition-all">
              Start Earning <ArrowRight className="inline-block ml-2" size={20} />
            </MagneticButton>
          </Link>
          
          <div className="mt-8 md:mt-10 text-mono-caps text-[10px] text-(--ink-4) tracking-[0.12em] leading-relaxed px-2">
            Built on Stellar | Soroban Contracts | BENJI + USDY Live | Non-custodial
          </div>
        </div>
      </section>
    </div>
  );
}

