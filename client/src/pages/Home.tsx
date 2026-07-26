import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { SplitText } from '@/components/ui/SplitText';
import { HeroWorkspacePreview } from '@/components/landing/HeroWorkspacePreview';
import { YieldCalculatorWidget } from '@/components/landing/YieldCalculatorWidget';
import { OrbitWheel } from '@/components/landing/OrbitWheel';
import { ArrowRight, Zap, ShieldCheck, Activity, Plus, Minus, Eye, Brain, Play, ShieldAlert, Sparkles, Lock, Radio } from 'lucide-react';
import { calculateValue } from '@/lib/formula';
import { useRaceStore } from '@/stores/raceStore';
import { useWalletStore } from '@/stores/walletStore';

/* ───────────────────────── Hero Strategy Options ───────────────────────── */
const STRATEGIES = [
  { id: 'tbills', name: 'Safe Harbor', apy: 4.80, label: 'T-Bills', asset: 'USDY', color: 'var(--sky)' },
  { id: 'allweather', name: 'All Weather', apy: 5.21, label: 'Balanced', asset: 'BENJI', color: 'var(--surge)' },
  { id: 'yieldmax', name: 'Yield Max', apy: 7.10, label: 'High Carry', asset: 'COND-VAULT', color: 'var(--amber)' },
];

/* ───────────────────────── Terminal log data ───────────────────────── */
const TERMINAL_LINES = [
  { tag: 'OBSERVE', color: 'var(--sky)', text: ':: BENJI spread tightened 14bps' },
  { tag: 'REASON', color: 'var(--amber)', text: ':: rotate 18% into short-duration sky box' },
  { tag: 'EXECUTE', color: 'var(--surge)', text: ':: rebalance(tx#A91F) + stream update' },
  { tag: 'LOG', color: 'rgba(0,122,94,0.7)', text: ':: kill switch armed, latency stable at 42ms' },
  { tag: 'OBSERVE', color: 'var(--sky)', text: ':: inflow spike from @satish_conduit vault' },
  { tag: 'REASON', color: 'var(--amber)', text: ':: maintain risk budget, hold custom box' },
  { tag: 'EXECUTE', color: 'var(--surge)', text: ':: continue stream / no manual action' },
  { tag: 'LOG', color: 'rgba(0,122,94,0.7)', text: ':: audit trail persisted on-chain' },
];

/* ───────────────────────── FAQ data ───────────────────────── */
const FAQ_DATA = [
  { q: 'Where does the yield come from?', a: 'Yield is generated from tokenized real-world assets — specifically US Treasury bills and government bonds issued by Franklin Templeton (BENJI) and Ondo (USDY). These are held by regulated custodians and interest accrues continuously on-chain.' },
  { q: 'Is my principal safe?', a: 'Your principal is secured by audited Soroban smart contracts on Stellar and backed by real-world custodians. The protocol is non-custodial — you retain full control of your assets at all times.' },
  { q: 'How do I withdraw my funds?', a: 'You can withdraw at any time with no lockups or penalties. Simply connect your Freighter wallet, navigate to your position, and claim your principal plus any accrued yield.' },
  { q: 'What is the COND agent?', a: 'COND is an AI-powered yield optimization agent that monitors rates, liquidity, and market conditions in real-time. It proposes rebalancing moves with transparent reasoning and executes them on Stellar — with a kill switch you control.' },
  { q: 'What wallets are supported?', a: 'Currently Freighter wallet is supported. Albedo support is coming soon. Any Stellar-compatible wallet will be supported in future releases.' },
];

/* ───────────────────────── Marquee items ───────────────────────── */
const MARQUEE_ITEMS = [
  { label: 'BENJI 4.5%', color: 'var(--amber)' },
  { label: 'USDY 5.10%', color: 'var(--sky)' },
  { label: 'Stellar TVL $1B+', color: 'var(--ink-3)' },
  { label: 'XLM $0.00001/tx', color: 'var(--surge)' },
  { label: 'Protocol 23 Active', color: 'var(--violet)' },
  { label: 'Conduit Testnet Live', color: 'var(--ink-1)' },
];

/* ═══════════════════════════ COMPONENT ═══════════════════════════ */

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterIntRef = useRef<HTMLSpanElement>(null);
  const counterDecRef = useRef<HTMLSpanElement>(null);
  const pendingRef = useRef<HTMLSpanElement>(null);
  const marqueeTrackRef = useRef<HTMLDivElement>(null);
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { leaderboard, fetchLeaderboard, loading } = useRaceStore();
  const { isConnected } = useWalletStore();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ── Selected Hero Strategy ── */
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[1]);

  /* ── Terminal typing state ── */
  const [visibleLines, setVisibleLines] = useState(0);

  /* ── rAF yield counter ── */
  useEffect(() => {
    const anchor = {
      principal: 10000,
      apy_bps: Math.round(selectedStrategy.apy * 100),
      sync_ts: Date.now() / 1000,
      box_id: selectedStrategy.id,
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

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedStrategy]);

  /* ── GSAP animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Floating hero card */
      gsap.to('.hero-counter-card', {
        y: -6,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      /* Bento card entrance */
      gsap.fromTo(
        '.bento-card',
        { y: 30, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'opacity,transform,visibility',
          scrollTrigger: {
            trigger: '.bento-grid',
            start: 'top 93%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      /* Bond box entrance */
      gsap.fromTo(
        '.bond-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: '.bond-grid',
            start: 'top 93%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      /* GSAP-powered marquee */
      if (marqueeTrackRef.current) {
        const sets = marqueeTrackRef.current.querySelectorAll('.gsap-marquee-set');
        if (sets.length > 0) {
          const setWidth = (sets[0] as HTMLElement).offsetWidth;
          gsap.to(marqueeTrackRef.current, {
            x: -setWidth,
            duration: 22,
            ease: 'none',
            repeat: -1,
            modifiers: {
              x: gsap.utils.unitize((x: number) => x % setWidth),
            },
          });
        }
      }

      /* Terminal typing effect */
      ScrollTrigger.create({
        trigger: '.cond-terminal',
        start: 'top 90%',
        onEnter: () => {
          TERMINAL_LINES.forEach((_, i) => {
            setTimeout(() => setVisibleLines(i + 1), i * 280);
          });
        },
        once: true,
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  /* ── Leaderboard fetch ── */
  useEffect(() => {
    void fetchLeaderboard('7d', 5);
  }, [fetchLeaderboard]);

  /* ── FAQ toggle with GSAP height animation ── */
  const toggleFaq = useCallback((idx: number) => {
    setOpenFaq(prev => {
      const next = prev === idx ? null : idx;

      if (prev !== null && faqRefs.current[prev]) {
        gsap.to(faqRefs.current[prev], {
          height: 0,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.inOut',
        });
      }

      if (next !== null && faqRefs.current[next]) {
        const el = faqRefs.current[next]!;
        gsap.set(el, { height: 'auto', opacity: 1 });
        const autoH = el.offsetHeight;
        gsap.fromTo(el, { height: 0, opacity: 0 }, { height: autoH, opacity: 1, duration: 0.4, ease: 'power2.out' });
      }

      return next;
    });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" ref={containerRef}>

      {/* ════════════════ SEC 1 · MONETRA FRAMED HERO CONTAINER ════════════════ */}
      <section className="pt-24 sm:pt-26 pb-8 px-3 sm:px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">

        {/* Framed Architectural Hero Box (Starts BELOW Navbar) */}
        <div className="hero-monetra-container relative p-6 sm:p-10 md:p-14 text-center overflow-hidden">

          {/* Floating Glowing Ambient Light Orbs Moving Inside Hero Box (No Dot Matrix) */}
          <div className="hero-orb-1" />
          <div className="hero-orb-2" />
          <div className="hero-orb-3" />

          {/* Content Wrapper */}
          <div className="relative z-10 max-w-6xl mx-auto">

            {/* Centered Sleek Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--paper-0)] border border-[var(--paper-edge)] mb-4 shadow-sm">
              <span className="dot-live" />
              <span className="text-mono text-[10.5px] text-[var(--surge)] font-semibold uppercase tracking-[0.14em]">
                Soroban Yield Streaming Protocol
              </span>
            </div>

            {/* Grand Centered Headline */}
            <h1 className="font-display tracking-[-0.04em] max-w-3xl mx-auto mb-3" style={{ lineHeight: 1.08 }}>
              <SplitText className="block text-[clamp(34px,4.5vw,60px)] font-bold text-[var(--ink-1)]">
                Yield, streaming.
              </SplitText>
              <SplitText className="block text-[clamp(34px,4.5vw,60px)] font-bold text-[var(--surge)]" delay={0.04}>
                Every second.
              </SplitText>
            </h1>

            {/* Centered Punchy Subtext */}
            <p className="font-body text-[15px] md:text-[16.5px] font-light text-[var(--ink-2)] leading-[1.6] max-w-lg mx-auto mb-5">
              Deposit into tokenized US Treasury bills. Earn real-world yield streamed live to your wallet.
            </p>

            {/* Centered Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-8">
              <Link to={isConnected ? "/bonds" : "/onboarding"}>
                <MagneticButton variant="primary" className="w-full sm:w-auto justify-center font-display text-[14px] font-semibold px-7 py-3 rounded-[var(--r-md)] hover:shadow-[0_0_24px_rgba(0,122,94,0.4)] transition-all">
                  {isConnected ? "Start Earning" : "Connect Wallet"} <ArrowRight className="inline-block ml-1.5" size={16} />
                </MagneticButton>
              </Link>
              <Link to="/docs">
                <MagneticButton className="w-full sm:w-auto justify-center bg-transparent border border-[var(--paper-edge)] text-[var(--ink-2)] font-display text-[14px] px-7 py-3 rounded-[var(--r-md)] hover:bg-[var(--paper-2)] hover:text-[var(--surge)] hover:border-[var(--surge-pale-2)] transition-all">
                  Read the Docs
                </MagneticButton>
              </Link>
            </div>

            {/* PROMINENT CENTERED PRODUCT DASHBOARD SHOWCASE */}
            <div className="w-full mb-8 relative">
              <HeroWorkspacePreview
                counterIntRef={counterIntRef}
                counterDecRef={counterDecRef}
                pendingRef={pendingRef}
                selectedStrategy={selectedStrategy}
                onSelectStrategy={setSelectedStrategy}
              />
            </div>

            {/* Partner Logos Bar Below Dashboard */}
            <div className="pt-6 border-t border-[var(--paper-edge)] max-w-3xl mx-auto">
              <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase tracking-[0.16em] mb-3 flex items-center justify-center gap-1.5">
                <Sparkles size={11} className="text-[var(--surge)]" /> Institutional Custodians & Infrastructure
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {['Stellar', 'Soroban', 'Franklin Templeton', 'Ondo Finance'].map((name) => (
                  <span key={name} className="font-display font-bold text-[13px] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors cursor-default">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 2 · MARQUEE TICKER ════════════════ */}
      <div className="w-full bg-[var(--paper-2)] border-y border-[var(--paper-edge)] overflow-hidden py-3">
        <div ref={marqueeTrackRef} className="gsap-marquee-track">
          {[0, 1, 2, 3].map(setIdx => (
            <div key={setIdx} className="gsap-marquee-set">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={`${setIdx}-${i}`} className="mx-8 text-mono text-[11px] tracking-wider font-medium" style={{ color: item.color }}>
                  {item.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════ SEC 3 · ASYMMETRIC BENTO GRID ════════════════ */}
      <section className="py-20 md:py-30 relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 md:px-14">
          <div className="grid md:grid-cols-2 gap-8 items-end mb-16">
            <div>
              <div className="section-eyebrow inline-block mb-5">
                <span className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.18em]">How It Works</span>
              </div>
              <h2 className="font-display tracking-[-0.03em]" style={{ lineHeight: 1.05 }}>
                <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--ink-1)]">The mechanics of</SplitText>
                <SplitText className="block text-[clamp(40px,5vw,72px)] font-light text-[var(--ink-3)]">continuous</SplitText>
                <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--surge)]">yield.</SplitText>
              </h2>
            </div>
            <p className="font-body text-[16px] font-light text-[var(--ink-3)] leading-[1.7] max-w-[400px] md:justify-self-end">
              Traditional bonds pay out semi-annually. We tokenize them on Stellar and stream accrued interest to your wallet every 5 seconds.
            </p>
          </div>

          <div className="space-y-6 bento-grid">
            {/* Top Row: 3 Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 01 — Deposit USDC */}
              <SpotlightCard className="bento-card paper-card-elevated p-6 md:p-8 relative flex flex-col justify-between min-h-[280px]">
                <div className="absolute top-4 right-4 font-display text-[70px] font-bold text-[var(--ink-1)] opacity-5 leading-none select-none">01</div>
                <div>
                  <div className="w-12 h-12 bg-[var(--paper-3)] rounded-[var(--r-md)] flex items-center justify-center mb-5 shadow-[0_2px_4px_var(--paper-shadow)] border border-[var(--paper-edge)]">
                    <Zap size={24} className="text-[var(--surge)]" />
                  </div>
                  <h3 className="font-display text-[22px] font-semibold text-[var(--ink-1)] tracking-[-0.02em] mb-2.5">Deposit USDC</h3>
                  <p className="font-secondary text-[14px] font-light text-[var(--ink-2)] leading-[1.65]">
                    Convert stablecoins into tokenized treasury bills. Secured by audited smart contracts & custodians.
                  </p>
                </div>
                <div className="mt-6 bg-[var(--paper-0)] border border-[var(--paper-edge)] rounded-[var(--r-sm)] p-3 font-mono text-[11px] text-[var(--surge)]">
                  <code>await conduit.deposit({'{'} amount: 10000 {'}'})</code>
                </div>
              </SpotlightCard>

              {/* Card 02 — Accrue Every Second */}
              <SpotlightCard className="bento-card paper-card p-6 md:p-8 relative flex flex-col justify-between min-h-[280px]">
                <div className="absolute top-4 right-4 font-display text-[70px] font-bold text-[var(--ink-1)] opacity-5 leading-none select-none">02</div>
                <div>
                  <div className="w-12 h-12 bg-[var(--paper-3)] rounded-[var(--r-md)] flex items-center justify-center mb-5 border border-[var(--paper-edge)]">
                    <Activity size={24} className="text-[var(--amber)]" />
                  </div>
                  <h3 className="font-display text-[22px] font-semibold text-[var(--ink-1)] tracking-[-0.02em] mb-2.5">Accrue Every Second</h3>
                  <p className="font-secondary text-[14px] font-light text-[var(--ink-2)] leading-[1.65]">
                    Interest calculates continuously on Stellar L1. Watch your balance grow with 0.00001 tx fees.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-mono text-[11px] text-[var(--amber)] font-medium">
                  <span className="dot-live" />
                  <span>Real-time continuous compounding</span>
                </div>
              </SpotlightCard>

              {/* Card 03 — Harvest Anytime */}
              <SpotlightCard className="bento-card paper-card p-6 md:p-8 relative flex flex-col justify-between min-h-[280px]">
                <div className="absolute top-4 right-4 font-display text-[70px] font-bold text-[var(--ink-1)] opacity-5 leading-none select-none">03</div>
                <div>
                  <div className="w-12 h-12 bg-[var(--paper-3)] rounded-[var(--r-md)] flex items-center justify-center mb-5 border border-[var(--paper-edge)]">
                    <ShieldCheck size={24} className="text-[var(--sky)]" />
                  </div>
                  <h3 className="font-display text-[22px] font-semibold text-[var(--ink-1)] tracking-[-0.02em] mb-2.5">Harvest Anytime</h3>
                  <p className="font-secondary text-[14px] font-light text-[var(--ink-2)] leading-[1.65]">
                    Claim accumulated yield instantly to your wallet. No lockups, zero exit penalties, 100% non-custodial.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-mono text-[11px] text-[var(--sky)] font-medium">
                  <ShieldCheck size={14} className="inline text-[var(--sky)]" />
                  <span>Non-custodial Soroban Vaults</span>
                </div>
              </SpotlightCard>
            </div>

            {/* Bottom Row: Full-Width Interactive Yield Calculator */}
            <SpotlightCard className="bento-card paper-card-elevated p-6 md:p-8 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-[var(--paper-edge)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-mono text-[10px] text-[var(--ink-4)] tracking-[0.14em] uppercase">Interactive Tool</span>
                    <span className="glass-pill px-2.5 py-0.5 rounded-full text-mono text-[9px] text-[var(--surge)] font-semibold">Live Simulation</span>
                  </div>
                  <h3 className="font-display text-[24px] font-bold text-[var(--ink-1)] tracking-[-0.02em]">
                    Yield Calculator & Projection
                  </h3>
                </div>
                <p className="font-secondary text-[13px] text-[var(--ink-3)] max-w-sm">
                  Adjust deposit amount and APY to simulate your streaming yield gains in real-time.
                </p>
              </div>
              <YieldCalculatorWidget />
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 4 · BOND BOXES ════════════════ */}
      <section className="py-10 md:py-20 relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-5 md:px-14">
          <div className="grid md:grid-cols-2 gap-8 items-end mb-14">
            <div>
              <div className="inline-block mb-5">
                <span className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.18em]">Bond Boxes</span>
              </div>
              <h2 className="font-display tracking-[-0.03em]" style={{ lineHeight: 1.05 }}>
                <span className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--ink-1)]">Curated boxes for</span>
                <span className="block text-[clamp(40px,5vw,72px)] font-light text-[var(--ink-3)]">every</span>
                <span className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--amber)]">market mood.</span>
              </h2>
            </div>
            <p className="font-body text-[16px] font-light text-[var(--ink-3)] leading-[1.7] max-w-[420px] md:justify-self-end">
              Pick a strategy box, stream returns in real-time, and rebalance as conditions shift.
            </p>
          </div>

          <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 bond-grid">
            <Link to="/bonds" className="bond-card md:row-span-2 block">
              <SpotlightCard className="paper-card-elevated h-full p-8 border-t-2 border-[var(--surge)] flex flex-col justify-between cursor-pointer hover:shadow-[0_12px_32px_var(--paper-shadow)] transition-shadow duration-300">
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
            </Link>

            <Link to="/bonds" className="bond-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-[var(--sky)] cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Safe Harbor</h3>
                <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Short duration, lower volatility exposure.</p>
                <div className="font-display text-[38px] tracking-[-0.03em] text-[var(--sky)]">4.8%</div>
              </SpotlightCard>
            </Link>

            <Link to="/bonds" className="bond-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-[var(--amber)] cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Yield Max</h3>
                <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Higher duration for stronger carry potential.</p>
                <div className="font-display text-[38px] tracking-[-0.03em] text-[var(--amber)]">7.1%</div>
              </SpotlightCard>
            </Link>

            <Link to="/bonds" className="bond-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-[var(--violet)] cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">COND Custom</h3>
                <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Agent-generated allocation and timing.</p>
                <div className="font-display text-[34px] tracking-[-0.03em] text-[var(--violet)]">Variable</div>
              </SpotlightCard>
            </Link>

            <Link to="/bonds" className="bond-card block">
              <SpotlightCard className="paper-card h-full p-6 border-t-2 border-[var(--rose)] cursor-pointer hover:shadow-[0_8px_16px_var(--paper-shadow)] transition-shadow duration-300">
                <h3 className="font-display text-[24px] tracking-[-0.02em] text-[var(--ink-1)] mb-2">Fixed Lock</h3>
                <p className="font-secondary text-[14px] text-[var(--ink-3)] mb-6">Term-based vault with protected payout profile.</p>
                <div className="font-display text-[34px] tracking-[-0.03em] text-[var(--rose)]">Guaranteed</div>
              </SpotlightCard>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 5 · COND AGENT ════════════════ */}
      <section className="py-10 md:py-[90px] relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-4 md:px-14">
          <div className="mb-14">
            <div className="inline-block mb-5">
              <span className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.18em]">AI Yield Agent</span>
            </div>
            <h2 className="font-display tracking-[-0.03em]" style={{ lineHeight: 1.05 }}>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--ink-1)]">Meet COND.</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-light text-[var(--ink-3)]">Your autonomous</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--surge)]">yield engine.</SplitText>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Terminal log viewer */}
            <div className="paper-card-elevated bg-[var(--paper-0)] p-6 md:p-8 cond-terminal">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
                <span className="ml-3 text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)]">cond.live.log</span>
              </div>
              <div className="space-y-3 font-mono text-[12px] leading-[1.7] break-words min-h-[240px]">
                {TERMINAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className="transition-all duration-300"
                    style={{
                      opacity: i < visibleLines ? 1 : 0,
                      transform: i < visibleLines ? 'translateY(0)' : 'translateY(8px)',
                    }}
                  >
                    <span style={{ color: line.color }}>{line.tag.padEnd(8)}</span>
                    {line.text}
                    {i === visibleLines - 1 && <span className="terminal-cursor" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Agent steps + Kill Switch */}
            <div className="space-y-4">
              <div className="paper-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-[var(--r-sm)] bg-[var(--sky-pale)] flex items-center justify-center">
                    <Eye size={18} className="text-[var(--sky)]" />
                  </div>
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] tracking-[0.12em]">01</div>
                    <h3 className="font-display text-[20px] tracking-[-0.02em] text-[var(--ink-1)]">Observe</h3>
                  </div>
                </div>
                <p className="font-secondary text-[14px] text-[var(--ink-2)]">COND monitors rates, liquidity, and user behavior in real-time.</p>
              </div>

              <div className="paper-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-[var(--r-sm)] bg-[var(--amber-pale)] flex items-center justify-center">
                    <Brain size={18} className="text-[var(--amber)]" />
                  </div>
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] tracking-[0.12em]">02</div>
                    <h3 className="font-display text-[20px] tracking-[-0.02em] text-[var(--ink-1)]">Reason</h3>
                  </div>
                </div>
                <p className="font-secondary text-[14px] text-[var(--ink-2)]">Structured CoT logic proposes moves with transparent rationale.</p>
              </div>

              <div className="paper-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-[var(--r-sm)] bg-[var(--surge-pale)] flex items-center justify-center">
                    <Play size={18} className="text-[var(--surge)]" />
                  </div>
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] tracking-[0.12em]">03</div>
                    <h3 className="font-display text-[20px] tracking-[-0.02em] text-[var(--ink-1)]">Execute</h3>
                  </div>
                </div>
                <p className="font-secondary text-[14px] text-[var(--ink-2)]">Transactions route on Stellar with instant state updates.</p>
              </div>

              <div className="paper-card p-6 bg-[var(--rose-pale)] border-[var(--rose)]/35">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert size={20} className="text-[var(--rose)]" />
                  <h4 className="font-display text-[20px] tracking-[-0.02em] text-[var(--rose)]">Kill Switch</h4>
                </div>
                <p className="font-secondary text-[14px] text-[var(--ink-2)]">One tap freezes automated execution while preserving withdrawals and stream visibility.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 6 · ORBIT WHEEL ════════════════ */}
      <section className="py-16 md:py-24 relative overflow-hidden border-y border-[var(--paper-edge)]">
        <div className="absolute inset-0 bg-[var(--paper-2)] -z-20" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <div className="max-w-[1600px] mx-auto px-6 md:px-14">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block mb-5">
                <span className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.18em]">Ecosystem</span>
              </div>
              <h2 className="font-display tracking-[-0.03em] mb-6" style={{ lineHeight: 1.05 }}>
                <SplitText className="block text-[clamp(36px,4.5vw,64px)] font-bold text-[var(--ink-1)]">Built on the</SplitText>
                <SplitText className="block text-[clamp(36px,4.5vw,64px)] font-bold text-[var(--surge)]">best stack.</SplitText>
              </h2>
              <p className="font-body text-[16px] font-light text-[var(--ink-3)] leading-[1.7] max-w-[400px]">
                Conduit integrates the most reliable infrastructure in DeFi — from Stellar's sub-cent transactions to Pyth's real-time oracles and passkey-powered authentication.
              </p>
            </div>
            <OrbitWheel />
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 7 · LEADERBOARD ════════════════ */}
      <section className="py-10 md:py-[90px] relative overflow-hidden border-b border-[var(--paper-edge)]">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[var(--paper-2)] -z-20" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        {/* Large favicon — right side */}
        <img
          src="/logofevicon.png"
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] md:w-[520px] opacity-[0.08] pointer-events-none select-none -z-10"
        />

        <div className="max-w-[1600px] mx-auto px-5 md:px-14">
          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start min-w-0">
            <div className="paper-card-elevated p-6 md:p-8 min-w-0">
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-6">Yield Race Leaderboard</div>
              <div className="overflow-x-auto max-w-full rounded-[var(--r-md)] border border-[var(--paper-edge)]">
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
                    {loading && leaderboard.length === 0 && (
                      <tr className="border-t border-[var(--paper-edge)]">
                        <td colSpan={4} className="px-4 py-4 text-center text-[var(--ink-3)]">Loading leaderboard...</td>
                      </tr>
                    )}

                    {!loading && leaderboard.length === 0 && (
                      <tr className="border-t border-[var(--paper-edge)]">
                        <td colSpan={4} className="px-4 py-4 text-center text-[var(--ink-3)]">No leaderboard data yet. Start the first race from the dashboard.</td>
                      </tr>
                    )}

                    {leaderboard.map((entry) => (
                      <tr key={`${entry.wallet}-${entry.rank}`} className="border-t border-[var(--paper-edge)]">
                        <td className="px-4 py-3">
                          {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : entry.rank === 3 ? '3rd' : entry.rank}
                        </td>
                        <td className="px-4 py-3">{entry.displayName}</td>
                        <td className="px-4 py-3">TVL ${entry.tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className={`px-4 py-3 text-right ${entry.rank <= 2 ? 'text-[var(--amber)]' : 'text-[var(--surge)]'}`}>
                          {entry.apy.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="paper-card-elevated p-6 md:p-8 border-t-2 border-t-[var(--rose)] min-w-0 overflow-hidden">
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Weekend Race</div>
              <div className="font-display text-[46px] md:text-[56px] leading-[0.9] tracking-[-0.03em] text-[var(--ink-1)] mb-2">$4,200</div>
              <div className="font-secondary text-[14px] text-[var(--ink-3)] mb-8">Prize pool for highest streamed yield this round.</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 min-w-0">
                <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">02</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Days</div></div>
                <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">18</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Hrs</div></div>
                <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">42</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Min</div></div>
                <div className="paper-card p-3 text-center"><div className="font-display text-[28px] leading-none">09</div><div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mt-1">Sec</div></div>
              </div>
              <Link to="/race" className="block">
                <MagneticButton variant="primary" className="w-full justify-center font-display text-[16px] py-3.5 rounded-[var(--r-md)]">
                  Join Race
                </MagneticButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 9 · FAQ ════════════════ */}
      <section className="py-20 md:py-28 border-t border-[var(--paper-edge)]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-14">
          <div className="mb-16">
            <h2 className="font-display tracking-[-0.04em]" style={{ lineHeight: 1.05 }}>
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--ink-1)]">Got questions?</span>
              <span className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--surge)]">Find answers.</span>
            </h2>
          </div>

          <div className="border-t border-[var(--paper-edge)]">
            {FAQ_DATA.map(({ q, a }, i) => (
              <div key={i} className="border-b border-[var(--paper-edge)]">
                <button
                  className="w-full flex items-start gap-6 py-7 text-left group"
                  onClick={() => toggleFaq(i)}
                >
                  <span className="text-mono text-[11px] text-[var(--ink-4)] tracking-[0.12em] pt-1 shrink-0 w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-display text-[clamp(16px,1.8vw,22px)] font-medium text-[var(--ink-1)] group-hover:text-[var(--surge)] transition-colors tracking-[-0.02em]">
                    {q}
                  </span>
                  <span className="shrink-0 text-[var(--ink-4)] group-hover:text-[var(--surge)] transition-colors pt-1">
                    {openFaq === i ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                <div
                  ref={(el) => { faqRefs.current[i] = el; }}
                  className="faq-answer"
                  style={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0, overflow: 'hidden' }}
                >
                  <div className="faq-answer-inner">
                    <p className="font-secondary text-[15px] text-[var(--ink-2)] leading-[1.8] max-w-2xl">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 10 · FOOTER CTA ════════════════ */}
      <section className="py-20 md:py-28 border-t border-[var(--paper-edge)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--paper-2)] -z-20" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <img
          src="/logofevicon.png"
          aria-hidden="true"
          className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[380px] md:w-[500px] opacity-[0.15] pointer-events-none select-none -z-10"
        />

        <div className="max-w-[1600px] mx-auto px-6 md:px-14">
          <div className="max-w-2xl">
            <h2 className="font-display tracking-[-0.04em] mb-10 md:mb-12" style={{ lineHeight: 1.05 }}>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--ink-1)]">The bond market has</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-light text-[var(--ink-3)] pb-1">been boring for</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--ink-1)]">300 years.</SplitText>
              <SplitText className="block text-[clamp(40px,5vw,72px)] font-bold text-[var(--surge)] pb-2">Not anymore.</SplitText>
            </h2>

            <Link to="/bonds" className="inline-flex">
              <MagneticButton variant="primary" className="font-display text-[16px] md:text-[18px] px-10 md:px-14 py-4 md:py-5 rounded-[var(--r-lg)] hover:shadow-[0_0_24px_rgba(0,122,94,0.45)] hover:-translate-y-1 transition-all">
                Start Earning <ArrowRight className="inline-block ml-2" size={20} />
              </MagneticButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════ SEC 11 · FOOTER ════════════════ */}
      <footer className="bg-[var(--paper-1)] border-t border-[var(--paper-edge)] relative overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, var(--ink-1) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* Ambient surge glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(0,122,94,0.06),transparent_70%)] pointer-events-none" />
        {/* Decorative favicons */}
        <img src="/logofevicon.png" alt="" aria-hidden="true" className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.04] select-none pointer-events-none" />
        <img src="/logofevicon.png" alt="" aria-hidden="true" className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.04] select-none pointer-events-none" />

        <div className="relative max-w-[1600px] mx-auto px-6 md:px-14 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/">
                <img src="/logo.png" alt="Conduit" className="h-28 w-auto object-contain -ml-5 -mt-4 mb-1" />
              </Link>
              <p className="font-secondary text-[13px] text-[var(--ink-3)] leading-[1.6] max-w-52">
                Real-time yield streaming on tokenized government bonds. Built on Stellar.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="dot-live" />
                <span className="font-display text-[11px] font-medium text-[var(--surge)] uppercase tracking-wider">Testnet Live</span>
              </div>
            </div>

            {/* Protocol */}
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Protocol</div>
              <ul className="space-y-3">
                {[
                  { label: 'Bond Boxes', to: '/bonds' },
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'COND Agent', to: '/agent' },
                  { label: 'Yield Race', to: '/race' },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="font-secondary text-[14px] text-[var(--ink-2)] hover:text-[var(--surge)] transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Developers</div>
              <ul className="space-y-3">
                {[
                  { label: 'Docs', to: '/docs', external: false },
                  { label: 'Creators', to: '/creators', external: false },
                  { label: 'NFTs', to: '/nfts', external: false },
                  { label: 'GitHub', to: 'https://github.com', external: true },
                ].map(({ label, to, external }) => (
                  <li key={label}>
                    {external ? (
                      <a href={to} target="_blank" rel="noopener noreferrer" className="font-secondary text-[14px] text-[var(--ink-2)] hover:text-[var(--surge)] transition-colors">
                        {label}
                      </a>
                    ) : (
                      <Link to={to} className="font-secondary text-[14px] text-[var(--ink-2)] hover:text-[var(--surge)] transition-colors">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Legal</div>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'Risk Disclosure', 'Cookie Policy'].map((label) => (
                  <li key={label}>
                    <a href="#" className="font-secondary text-[14px] text-[var(--ink-2)] hover:text-[var(--surge)] transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-[var(--paper-edge)] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-secondary text-[12px] text-[var(--ink-4)]">
              © {new Date().getFullYear()} Conduit Protocol. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-secondary text-[12px] text-[var(--ink-4)]">
              <span>Built on Stellar</span>
              <span className="text-[var(--paper-edge)]">|</span>
              <span>Soroban Contracts</span>
              <span className="text-[var(--paper-edge)]">|</span>
              <span>Non-custodial</span>
              <span className="text-[var(--paper-edge)]">|</span>
              <span>Yield is variable. Smart contracts carry risk.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
