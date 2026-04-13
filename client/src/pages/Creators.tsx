import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Heart, ArrowUpRight, Sparkles, ShieldCheck } from 'lucide-react';
import { api, type CreatorPoolSummary } from '@/lib/api';

function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function Creators() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pools, setPools] = useState<CreatorPoolSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.creator-item',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform,visibility' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getCreatorPools();
        setPools(res.pools);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const featured = pools[0] ?? null;
  const rest = useMemo(() => pools.slice(1), [pools]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto" ref={containerRef}>
        <header className="creator-item mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] mb-4">
            <Users size={13} className="text-[var(--ink-3)]" />
            <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)]">Creator Pools</span>
          </div>
          <h1 className="font-display text-[30px] md:text-[44px] tracking-[-0.03em] leading-[1.05] text-[var(--ink-1)]">
            Subscription-free creator monetization,
            <span className="block text-[var(--surge)]">powered by real bond yield.</span>
          </h1>
          <p className="mt-3 max-w-[760px] font-secondary text-[15px] text-[var(--ink-3)] leading-[1.7]">
            Fans deposit into curated Stellar bond boxes and keep earning live stream yield. Creators receive a transparent, pre-set share of generated yield — no ads, no subscriptions, no hidden fees.
          </p>
        </header>

        <section className="creator-item grid lg:grid-cols-[1.2fr_1fr] gap-6 mb-8">
          <div className="paper-card-elevated p-6 md:p-8 border-t-[2px] border-t-[var(--surge)]">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Protocol Snapshot</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="paper-card p-4"><div className="text-mono text-[10px] text-[var(--ink-4)] uppercase mb-1">Active Pools</div><div className="font-display text-[26px] text-[var(--ink-1)]">84</div></div>
              <div className="paper-card p-4"><div className="text-mono text-[10px] text-[var(--ink-4)] uppercase mb-1">Total TVL</div><div className="font-display text-[26px] text-[var(--ink-1)]">$3.8M</div></div>
              <div className="paper-card p-4"><div className="text-mono text-[10px] text-[var(--ink-4)] uppercase mb-1">Avg Fan APY</div><div className="font-display text-[26px] text-[var(--surge)]">5.4%</div></div>
              <div className="paper-card p-4"><div className="text-mono text-[10px] text-[var(--ink-4)] uppercase mb-1">Creator Share</div><div className="font-display text-[26px] text-[var(--ink-1)]">14%</div></div>
            </div>
            <div className="paper-card p-4 md:p-5">
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-3">How Creator Pools Work</div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-md)] p-3">
                  <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1">01 Deposit</div>
                  <p className="font-secondary text-[13px] text-[var(--ink-2)]">Fans allocate funds into curated Bond Boxes.</p>
                </div>
                <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-md)] p-3">
                  <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1">02 Stream</div>
                  <p className="font-secondary text-[13px] text-[var(--ink-2)]">Yield streams in real time to fan wallets.</p>
                </div>
                <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-md)] p-3">
                  <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1">03 Share</div>
                  <p className="font-secondary text-[13px] text-[var(--ink-2)]">Creator receives preset performance share.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="paper-card p-6 md:p-8 border-t-[2px] border-t-[var(--rose)]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-[var(--rose)]" />
              <h2 className="font-display text-[20px] text-[var(--ink-1)]">Trust & Controls</h2>
            </div>
            <ul className="space-y-3 font-secondary text-[14px] text-[var(--ink-2)] leading-[1.7]">
              <li>Built on Stellar with near-zero fee settlement.</li>
              <li>Bond box transparency with auditable stream metrics.</li>
              <li>COND risk controls and user-level kill-switch support.</li>
              <li>Clear share percentages visible before joining any pool.</li>
            </ul>
            <div className="mt-5 p-3 rounded-[var(--r-md)] bg-[var(--surge-pale)] border border-[var(--surge-pale-2)] text-[13px] text-[var(--ink-2)]">
              Yield tokenization is gated to accredited users. Creator pools remain simple savings-first products for broad participation.
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:grid-rows-3">
          {featured ? (
            <article
              key={featured.id}
              className="creator-item paper-card spotlight-card p-6 md:p-7 border-t-[2px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(0,0,0,0.09)] lg:row-span-2"
              style={{ borderTopColor: featured.tone ?? 'var(--surge)' }}
            >
              <div className="relative z-[1]">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surge-pale)] border border-[var(--surge-pale-2)] px-2 py-0.5 mb-2">
                      <span className="dot-live" />
                      <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-[var(--surge)]">Featured Pool</span>
                    </div>
                    <h3 className="font-display text-[28px] tracking-[-0.02em] text-[var(--ink-1)]">{featured.name}</h3>
                    <div className="text-mono text-[11px] text-[var(--ink-2)] mt-1">{featured.handle}</div>
                  </div>
                  <Heart size={16} className="text-[var(--surge)]" />
                </div>

                <p className="font-secondary text-[15px] text-[var(--ink-1)]/80 mb-5 leading-[1.65]">{featured.blurb ?? 'Creator pool with transparent yield sharing.'}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-[var(--r-md)] bg-[var(--paper-1)] border border-[var(--paper-edge)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="text-mono text-[9px] uppercase text-[var(--ink-2)] mb-1">Followers</div>
                    <div className="font-display text-[22px] leading-none text-[var(--ink-1)]">{featured.followers.toLocaleString()}</div>
                  </div>
                  <div className="rounded-[var(--r-md)] bg-[var(--paper-1)] border border-[var(--paper-edge)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="text-mono text-[9px] uppercase text-[var(--ink-2)] mb-1">TVL</div>
                    <div className="font-display text-[22px] leading-none text-[var(--ink-1)]">{formatUsdCompact(featured.tvl)}</div>
                  </div>
                  <div className="rounded-[var(--r-md)] bg-[var(--paper-1)] border border-[var(--paper-edge)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="text-mono text-[9px] uppercase text-[var(--ink-2)] mb-1">Fan APY</div>
                    <div className="font-display text-[22px] leading-none text-[var(--surge)]">{((featured.fanApyHintBps ?? featured.box.apyBps) / 100).toFixed(1)}%</div>
                  </div>
                  <div className="rounded-[var(--r-md)] bg-[var(--paper-1)] border border-[var(--paper-edge)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="text-mono text-[9px] uppercase text-[var(--ink-2)] mb-1">Share</div>
                    <div className="font-display text-[22px] leading-none" style={{ color: featured.tone ?? 'var(--violet)' }}>{(featured.creatorShareBps / 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="rounded-[var(--r-md)] bg-[var(--paper-1)] border border-[var(--paper-edge)] p-4 mb-5">
                  <div className="text-mono text-[10px] uppercase text-[var(--ink-2)] mb-2">Strategy Allocation</div>
                  <div className="flex items-center justify-between text-[13px] font-secondary text-[var(--ink-1)]/80 mb-2">
                    <span>{featured.box.name}</span>
                    <span>Low-volatility core</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--paper-3)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--surge)] w-[72%]" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to={`/creators/${featured.id}`} className="flex-1 px-3 py-2.5 rounded-[var(--r-md)] bg-[var(--surge)] hover:bg-[var(--surge-mid)] text-[12px] font-display text-white transition-colors inline-flex items-center justify-center gap-1.5">
                    View Pool <ArrowUpRight size={13} />
                  </Link>
                  <button className="px-3 py-2.5 rounded-[var(--r-md)] border border-[var(--surge-pale-2)] bg-[var(--surge-pale)] text-[12px] font-display text-[var(--surge)]">
                    Follow Creator
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div className="creator-item paper-card p-6 md:p-7 lg:row-span-2">
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-2">
                Creator Pools
              </div>
              <div className="font-secondary text-[14px] text-[var(--ink-2)]">
                {loading ? 'Loading pools…' : 'No pools available.'}
              </div>
            </div>
          )}

          {rest.map((pool, idx) => (
            <article
              key={pool.id}
              className="creator-item paper-card spotlight-card p-5 border-t-[2px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] lg:col-start-2"
              style={{ borderTopColor: pool.tone ?? 'var(--surge)', gridRowStart: idx + 1 }}
            >
              <div className="relative z-[1]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display text-[22px] tracking-[-0.02em] text-[var(--ink-1)]">{pool.name}</h3>
                    <div className="text-mono text-[11px] text-[var(--ink-2)] mt-1">{pool.handle}</div>
                  </div>
                  <Sparkles size={15} className="text-[var(--ink-2)]" />
                </div>
                <p className="font-secondary text-[14px] text-[var(--ink-1)]/80 mb-4 leading-[1.6]">{pool.blurb ?? 'Creator pool with transparent yield sharing.'}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                  <div><div className="text-mono text-[9px] uppercase text-[var(--ink-2)]">Followers</div><div className="font-secondary text-[14px] text-[var(--ink-1)]">{pool.followers.toLocaleString()}</div></div>
                  <div><div className="text-mono text-[9px] uppercase text-[var(--ink-2)]">Pool TVL</div><div className="font-secondary text-[14px] text-[var(--ink-1)]">{formatUsdCompact(pool.tvl)}</div></div>
                  <div><div className="text-mono text-[9px] uppercase text-[var(--ink-2)]">Fan APY</div><div className="font-secondary text-[14px] text-[var(--ink-1)]">{((pool.fanApyHintBps ?? pool.box.apyBps) / 100).toFixed(1)}%</div></div>
                  <div><div className="text-mono text-[9px] uppercase text-[var(--ink-2)]">Share</div><div className="font-display text-[22px] leading-none" style={{ color: pool.tone ?? 'var(--surge)' }}>{(pool.creatorShareBps / 100).toFixed(1)}%</div></div>
                </div>
                <Link to={`/creators/${pool.id}`} className="w-full px-3 py-2 rounded-[var(--r-md)] bg-[var(--surge)] hover:bg-[var(--surge-mid)] text-[12px] font-display text-white transition-colors inline-flex items-center justify-center gap-1.5">
                  View Pool <ArrowUpRight size={13} />
                </Link>
              </div>
            </article>
          ))}

          <div className="creator-item paper-card p-5 border border-[var(--paper-edge)] lg:row-start-3 lg:col-start-1">
            <div className="text-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)] mb-2">Launch Your Creator Pool</div>
            <p className="font-secondary text-[14px] text-[var(--ink-2)] leading-[1.6] mb-4">
              Set your share, pick your default Bond Box, and onboard fans with transparent real-time yield tracking.
            </p>
            <button className="px-4 py-2.5 rounded-[var(--r-md)] bg-[var(--surge)] text-white font-display text-[12px]">
              Apply as Creator
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

