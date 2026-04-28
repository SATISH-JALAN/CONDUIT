import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { TiltCard } from '@/components/ui/TiltCard';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { SplitText } from '@/components/ui/SplitText';
import { ScrambleText } from '@/components/ui/ScrambleText';
import { ArrowRight, Zap, ShieldCheck, Activity, Plus, Minus } from 'lucide-react';
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      <section className="min-h-screen pt-20 pb-16 md:pt-28 md:pb-20 relative flex flex-col justify-center overflow-hidden">
        {/* Ambient color pools */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,122,94,0.06),transparent_70%)] pointer-events-none -z-10" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(180,83,9,0.04),transparent_70%)] pointer-events-none -z-10" />

        {/* INTERACTIVE ANTIGRAVITY PARTICLES */}
        <div className="absolute inset-0 z-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
          <HeroParticles key="monochrome-grid-v2" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-14 w-full relative z-10">

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <span className="dot-live"></span>
            <span className="text-mono text-[10px] text-(--ink-4) uppercase tracking-[0.18em]">The Protocol</span>
          </div>

          {/* Side-by-side: heading left, card right */}
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-16 items-center">

            {/* Left: heading + body + buttons + partners */}
            <div className="space-y-7 md:space-y-9">
              <h1 className="font-display tracking-[-0.04em]" style={{ lineHeight: 1.0 }}>
                <SplitText className="block text-[clamp(44px,6.5vw,96px)] font-bold text-(--ink-1)">Yield,</SplitText>
                <SplitText className="block text-[clamp(44px,6.5vw,96px)] font-bold text-(--ink-1)" delay={0.04}>streaming.</SplitText>
                <SplitText className="block text-[clamp(44px,6.5vw,96px)] font-bold text-(--surge)" delay={0.08}>Every second.</SplitText>
              </h1>

              <p className="font-body text-[16px] md:text-[18px] font-light text-(--ink-2) leading-[1.75] max-w-md">
                Deposit into tokenized government bonds. Watch a live counter tick upward every second. Built on Stellar — $0.00001 per transaction.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={isConnected ? "/bonds" : "/onboarding"}>
                  <MagneticButton variant="primary" className="w-full sm:w-auto justify-center font-display text-[15px] font-semibold px-8 py-4 rounded-(--r-lg) hover:shadow-[0_0_28px_rgba(0,122,94,0.4)] transition-all">
                    {isConnected ? "Start Earning" : "Connect Wallet"} <ArrowRight className="inline-block ml-2" size={16} />
                  </MagneticButton>
                </Link>
                <Link to="/docs">
                  <MagneticButton className="w-full sm:w-auto justify-center bg-transparent border border-(--paper-edge) text-(--ink-2) font-display text-[15px] px-8 py-4 rounded-(--r-lg) hover:bg-(--paper-2) hover:text-(--surge) hover:border-(--surge-pale-2) transition-all">
                    Read the Docs
                  </MagneticButton>
                </Link>
              </div>

              {/* Partner logos */}
              <div className="pt-6 border-t border-(--paper-edge)">
                <div className="text-mono text-[9px] text-(--ink-4) uppercase tracking-[0.18em] mb-4">Partnered With</div>
                <div className="flex flex-wrap items-center gap-5 md:gap-7">
                  {['Stellar', 'Soroban', 'Franklin Templeton', 'Ondo Finance'].map((name) => (
                    <span key={name} className="font-display font-semibold text-[13px] text-(--ink-3) hover:text-(--ink-1) transition-colors cursor-default">{name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Counter Card */}
            <div className="relative hero-counter-card">
              <div className="absolute inset-4 bg-(--surge) rounded-[40px] filter blur-[80px] opacity-[0.18]" />
              <TiltCard className="chrome-border chrome-spinning paper-card-elevated p-6 md:p-8 relative z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle,rgba(0,122,94,0.06),transparent_70%)] pointer-events-none" />

                <div className="flex justify-between items-center mb-5 md:mb-7">
                  <div className="text-mono text-[9px] text-(--ink-4) tracking-wider uppercase">Demo · $10,000 · 5.21% APY</div>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-(--surge-pale) border border-(--surge-pale-2)">
                    <span className="dot-live"></span>
                    <span className="text-mono text-[9px] text-(--surge) font-medium">LIVE</span>
                  </div>
                </div>

                <div className="mb-1 flex items-baseline">
                  <span ref={counterIntRef} className="font-display text-[clamp(30px,4vw,52px)] font-bold text-(--ink-1) tabular-nums tracking-[-0.04em] leading-none">$10,000</span>
                  <span ref={counterDecRef} className="font-mono text-[clamp(18px,2.5vw,30px)] text-(--surge) tabular-nums leading-none font-medium">.000000</span>
                </div>
                <div className="text-mono text-[10px] text-(--surge) opacity-60 mb-6 tracking-wider">+$0.000016 / second</div>

                <div className="mb-6">
                  <div className="flex justify-between text-mono text-[10px] text-(--ink-4) mb-2 uppercase tracking-wider">
                    <span>Streaming</span>
                    <span ref={pendingRef} className="text-(--surge)">+$0.0000</span>
                  </div>
                  <div className="h-1 bg-(--paper-3) rounded-full overflow-hidden">
                    <div className="stream-bar-fill"></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-(--paper-edge) rounded-lg overflow-hidden">
                  <div className="bg-(--paper-1) p-3 md:p-4">
                    <div className="text-mono text-[9px] text-(--ink-4) uppercase mb-1 tracking-wider">Pending</div>
                    <div className="font-display text-[16px] md:text-[18px] text-(--ink-1) font-semibold">$14.20</div>
                  </div>
                  <div className="bg-(--paper-1) p-3 md:p-4">
                    <div className="text-mono text-[9px] text-(--ink-4) uppercase mb-1 tracking-wider">APY</div>
                    <div className="font-display text-[16px] md:text-[18px] text-(--surge) font-semibold">5.21%</div>
                  </div>
                  <div className="bg-(--paper-1) p-3 md:p-4">
                    <div className="text-mono text-[9px] text-(--ink-4) uppercase mb-1 tracking-wider">Daily</div>
                    <div className="font-display text-[16px] md:text-[18px] text-(--ink-1) font-semibold">$1.42</div>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        </div>
      </section>

      {/* AMBIENT CONTEXT STRIP */}
      <div className="w-full bg-(--paper-2) border-y border-(--paper-edge) overflow-hidden py-3">
        <div className="flex whitespace-nowrap animate-[marquee_18s_linear_infinite] text-mono text-[11px] tracking-wider w-max">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="flex items-center">
              <span className="mx-8 text-(--amber)">BENJI 4.5%</span>
              <span className="mx-8 text-(--sky)">USDY 5.10%</span>
              <span className="mx-8 text-(--ink-3)">Stellar TVL $1B+</span>
              <span className="mx-8 text-(--surge)">XLM $0.00001/tx</span>
              <span className="mx-8 text-(--violet)">Protocol 23 Active</span>
              <span className="mx-8 text-(--ink-1) font-medium">Conduit Testnet Live</span>
            </span>
          ))}
        </div>
      </div>

      {/* START IN 60 SECONDS */}
      <section className="py-16 md:py-24 relative overflow-hidden border-b border-(--paper-edge)">
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="text-center mb-12">
            <h2 className="font-display tracking-[-0.03em] mb-5">
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">Start earning in</span>
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--surge)">60 seconds.</span>
            </h2>
            <p className="font-secondary text-[16px] text-(--ink-3) max-w-lg mx-auto">
              From zero to streaming yield, completely non-custodial and secure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px bg-(--paper-edge) -translate-y-1/2 -z-10" />

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
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 md:py-30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="grid md:grid-cols-2 gap-8 items-end mb-16">
            <div>
              <div className="section-eyebrow inline-block mb-5">
                <span className="text-mono text-[10px] text-(--ink-4) uppercase tracking-[0.18em]">How It Works</span>
              </div>
              <h2 className="font-display tracking-[-0.03em]" style={{ lineHeight: 1.05 }}>
                <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">The mechanics of</SplitText>
                <SplitText className="block text-[clamp(40px,5vw,72px)] font-light text-(--ink-3)">continuous</SplitText>
                <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-(--surge)">yield.</SplitText>
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
        </div>
      </section>

      {/* BOND BOXES */}
      <section className="py-10 md:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-14">
          <div className="grid md:grid-cols-2 gap-8 items-end mb-14">
            <div>
              <div className="inline-block mb-5">
                <span className="text-mono text-[10px] text-(--ink-4) uppercase tracking-[0.18em]">Bond Boxes</span>
              </div>
              <h2 className="font-display tracking-[-0.03em]" style={{ lineHeight: 1.05 }}>
                <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">Curated boxes for</span>
                <span className="block text-[clamp(40px,5vw,72px)] font-light text-(--ink-3)">every</span>
                <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--amber)">market mood.</span>
              </h2>
            </div>
            <p className="font-body text-[16px] font-light text-(--ink-3) leading-[1.7] max-w-105 md:justify-self-end">
              Pick a strategy box, stream returns in real-time, and rebalance as conditions shift.
            </p>
          </div>

          <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 bento-grid">
            <Link to="/bonds" className="bento-card md:row-span-2 block">
              <SpotlightCard className="paper-card-elevated h-full p-8 border-t-2 border-(--surge) flex flex-col justify-between cursor-pointer hover:shadow-[0_12px_32px_var(--paper-shadow)] transition-shadow duration-300">
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
            </Link>

            <Link to="/bonds" className="bento-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-(--sky) cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Safe Harbor</h3>
                <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Short duration, lower volatility exposure.</p>
                <div className="font-display text-[38px] tracking-[-0.03em] text-(--sky)">4.8%</div>
              </SpotlightCard>
            </Link>

            <Link to="/bonds" className="bento-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-(--amber) cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Yield Max</h3>
                <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Higher duration for stronger carry potential.</p>
                <div className="font-display text-[38px] tracking-[-0.03em] text-(--amber)">7.1%</div>
              </SpotlightCard>
            </Link>

            <Link to="/bonds" className="bento-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-(--violet) cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">COND Custom</h3>
                <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Agent-generated allocation and timing.</p>
                <div className="font-display text-[34px] tracking-[-0.03em] text-(--violet)">Variable</div>
              </SpotlightCard>
            </Link>

            <Link to="/bonds" className="bento-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-(--rose) cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-(--ink-1) mb-2">Fixed Lock</h3>
                <p className="font-secondary text-[14px] text-(--ink-3) mb-6">Term-based vault with protected payout profile.</p>
                <div className="font-display text-[34px] tracking-[-0.03em] text-(--rose)">Guaranteed</div>
              </SpotlightCard>
            </Link>
          </div>
        </div>
      </section>

      {/* COND SECTION */}
      <section className="py-10 md:py-22.5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-14">
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
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="py-10 md:py-22.5 relative overflow-hidden border-y border-(--paper-edge)">
        {/* Background texture */}
        <div className="absolute inset-0 bg-(--paper-2) -z-20" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        {/* Large favicon — right side, behind content */}
        <img
          src="/logofevicon.png"
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] md:w-[520px] opacity-[0.08] pointer-events-none select-none -z-10"
        />

        <div className="max-w-7xl mx-auto px-5 md:px-14">
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
              <Link to="/race" className="block">
                <MagneticButton variant="primary" className="w-full justify-center font-display text-[16px] py-3.5 rounded-(--r-md)">
                  Join Race
                </MagneticButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THE NUMBERS */}
      <section className="py-20 md:py-28 border-t border-(--paper-edge)">
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="mb-14">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-[0.18em] mb-6">The Numbers</div>
            <h2 className="font-display tracking-[-0.04em]" style={{ lineHeight: 1.05 }}>
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">What the protocol</span>
              <span className="block text-[clamp(40px,5vw,72px)] font-light text-(--ink-3)">actually returns.</span>
            </h2>
          </div>

          {/* Kimia-style flat bordered grid — no cards, just borders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-(--paper-edge)">
            {[
              { num: '01', label: 'Baseline APY', value: '4.5–5.6%', sub: 'Calm markets. Steady yield.', color: 'text-(--surge)', link: '/bonds' },
              { num: '02', label: 'Max APY', value: '7.1%', sub: 'Higher duration carry potential.', color: 'text-(--amber)', link: '/bonds' },
              { num: '03', label: 'Tx Cost', value: '$0.00001', sub: 'Per transaction on Stellar.', color: 'text-(--sky)', link: '/docs' },
              { num: '04', label: 'Stream Interval', value: '5 sec', sub: 'Yield hits your wallet live.', color: 'text-(--violet)', link: '/docs' },
            ].map(({ num, label, value, sub, color, link }, i) => (
              <Link
                key={num}
                to={link}
                className={`p-8 md:p-10 group hover:bg-(--paper-2) transition-colors duration-200 ${i < 3 ? 'border-b md:border-b-0 md:border-r border-(--paper-edge)' : ''}`}
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-[0.12em]">{num}</div>
                  <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-[0.12em]">{label}</div>
                </div>
                <div className={`font-display text-[clamp(36px,3.5vw,52px)] font-bold tracking-[-0.03em] leading-none mb-4 ${color}`}>{value}</div>
                <div className="font-secondary text-[13px] text-(--ink-3) leading-relaxed">{sub}</div>
              </Link>
            ))}
          </div>

          {/* Footnote — kimia style */}
          <div className="mt-8 pt-6 border-t border-(--paper-edge)">
            <div className="text-mono text-[9px] text-(--ink-4) uppercase tracking-[0.12em] mb-2">Footnote</div>
            <p className="font-secondary text-[13px] text-(--ink-3) leading-relaxed max-w-2xl">
              Yield rates are variable and depend on market conditions. Principal is secured by audited Soroban smart contracts and real-world custodians. Non-custodial at all times.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 border-t border-(--paper-edge)">
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="mb-16">
            <h2 className="font-display tracking-[-0.04em]" style={{ lineHeight: 1.05 }}>
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">Got questions?</span>
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-(--surge)">Find answers.</span>
            </h2>
          </div>

          <div className="border-t border-(--paper-edge)">
            {[
              { q: 'Where does the yield come from?', a: 'Yield is generated from tokenized real-world assets — specifically US Treasury bills and government bonds issued by Franklin Templeton (BENJI) and Ondo (USDY). These are held by regulated custodians and the interest accrues continuously on-chain.' },
              { q: 'Is my principal safe?', a: 'Your principal is secured by audited Soroban smart contracts on Stellar and backed by real-world custodians. The protocol is non-custodial — you retain full control of your assets at all times.' },
              { q: 'How do I withdraw my funds?', a: 'You can withdraw at any time with no lockups or penalties. Simply connect your Freighter wallet, navigate to your position, and claim your principal plus any accrued yield.' },
              { q: 'What is the COND agent?', a: 'COND is an AI-powered yield optimization agent that monitors rates, liquidity, and market conditions in real-time. It proposes rebalancing moves with transparent reasoning and executes them on Stellar — with a kill switch you control.' },
              { q: 'What wallets are supported?', a: 'Currently Freighter wallet is supported. Albedo support is coming soon. Any Stellar-compatible wallet will be supported in future releases.' },
            ].map(({ q, a }, i) => (
              <div key={i} className="border-b border-(--paper-edge)">
                <button
                  className="w-full flex items-start gap-6 py-7 text-left group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-mono text-[11px] text-(--ink-4) tracking-[0.12em] pt-1 shrink-0 w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-display text-[clamp(16px,1.8vw,22px)] font-medium text-(--ink-1) group-hover:text-(--surge) transition-colors tracking-[-0.02em]">
                    {q}
                  </span>
                  <span className="shrink-0 text-(--ink-4) group-hover:text-(--surge) transition-colors pt-1">
                    {openFaq === i ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="pl-12 pb-7">
                    <p className="font-secondary text-[15px] text-(--ink-2) leading-[1.8] max-w-2xl">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-20 md:py-28 border-t border-(--paper-edge) relative overflow-hidden">
        <div className="absolute inset-0 bg-(--paper-2) -z-20" />
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* Large favicon — right side, behind content */}
        <img
          src="/logofevicon.png"
          aria-hidden="true"
          className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[380px] md:w-[500px] opacity-[0.15] pointer-events-none select-none -z-10"
        />

        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="max-w-2xl">
            <h2 className="font-display tracking-[-0.04em] mb-10 md:mb-12" style={{ lineHeight: 1.05 }}>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">The bond market has</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-light text-(--ink-3) pb-1">been boring for</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-(--ink-1)">300 years.</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-(--surge) pb-2">Not anymore.</SplitText>
            </h2>

            <Link to="/bonds" className="inline-flex">
              <MagneticButton variant="primary" className="font-display text-[16px] md:text-[18px] px-10 md:px-14 py-4 md:py-5 rounded-(--r-lg) hover:shadow-[0_0_24px_rgba(0,122,94,0.45)] hover:-translate-y-1 transition-all">
                Start Earning <ArrowRight className="inline-block ml-2" size={20} />
              </MagneticButton>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-(--paper-1) border-t border-(--paper-edge) relative overflow-hidden">
        {/* Background texture — subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Ambient surge glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(0,122,94,0.06),transparent_70%)] pointer-events-none" />

        {/* Decorative favicon — left */}
        <img
          src="/logofevicon.png"
          alt=""
          aria-hidden="true"
          className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.04] select-none pointer-events-none"
        />
        {/* Decorative favicon — right */}
        <img
          src="/logofevicon.png"
          alt=""
          aria-hidden="true"
          className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.04] select-none pointer-events-none"
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-14 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/">
                <img src="/logo.png" alt="Conduit" className="h-28 w-auto object-contain -ml-5 -mt-4 mb-1" />
              </Link>
              <p className="font-secondary text-[13px] text-(--ink-3) leading-[1.6] max-w-52">
                Real-time yield streaming on tokenized government bonds. Built on Stellar.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="dot-live"></span>
                <span className="font-display text-[11px] font-medium text-(--surge) uppercase tracking-wider">Testnet Live</span>
              </div>
            </div>

            {/* Protocol */}
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-4">Protocol</div>
              <ul className="space-y-3">
                {[
                  { label: 'Bond Boxes', to: '/bonds' },
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'COND Agent', to: '/agent' },
                  { label: 'Yield Race', to: '/race' },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="font-secondary text-[14px] text-(--ink-2) hover:text-(--surge) transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-4">Developers</div>
              <ul className="space-y-3">
                {[
                  { label: 'Docs', to: '/docs' },
                  { label: 'Creators', to: '/creators' },
                  { label: 'NFTs', to: '/nfts' },
                  { label: 'GitHub', to: 'https://github.com', external: true },
                ].map(({ label, to, external }) => (
                  <li key={label}>
                    {external ? (
                      <a href={to} target="_blank" rel="noopener noreferrer" className="font-secondary text-[14px] text-(--ink-2) hover:text-(--surge) transition-colors">
                        {label}
                      </a>
                    ) : (
                      <Link to={to} className="font-secondary text-[14px] text-(--ink-2) hover:text-(--surge) transition-colors">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-4">Legal</div>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'Risk Disclosure', 'Cookie Policy'].map((label) => (
                  <li key={label}>
                    <a href="#" className="font-secondary text-[14px] text-(--ink-2) hover:text-(--surge) transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-(--paper-edge) flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-secondary text-[12px] text-(--ink-4)">
              © {new Date().getFullYear()} Conduit Protocol. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-secondary text-[12px] text-(--ink-4)">
              <span>Built on Stellar</span>
              <span className="text-(--paper-edge)">|</span>
              <span>Soroban Contracts</span>
              <span className="text-(--paper-edge)">|</span>
              <span>Non-custodial</span>
              <span className="text-(--paper-edge)">|</span>
              <span>Yield is variable. Smart contracts carry risk.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

