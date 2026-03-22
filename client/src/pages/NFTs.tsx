import React, { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sparkles, ShieldCheck, ArrowUpRight, Ticket } from 'lucide-react';

const NFT_YIELDS = [
  {
    id: '1',
    name: 'BENJI Stream #1042',
    box: 'Safe Harbor',
    yield: '5.0%',
    floor: '$188',
    accent: 'var(--sky)',
  },
  {
    id: '2',
    name: 'USDY Stream #2209',
    box: 'All Weather',
    yield: '5.6%',
    floor: '$246',
    accent: 'var(--surge)',
  },
  {
    id: '3',
    name: 'KRWQ Stream #0917',
    box: 'Yield Max',
    yield: '7.1%',
    floor: '$302',
    accent: 'var(--amber)',
  },
  {
    id: '4',
    name: 'COND Dynamic #3321',
    box: 'COND Custom',
    yield: 'Variable',
    floor: '$418',
    accent: 'var(--violet)',
  },
];

export function NFTs() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.nft-item',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform,visibility' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto" ref={containerRef}>
        <header className="nft-item mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] mb-4">
            <Ticket size={13} className="text-[var(--ink-3)]" />
            <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)]">Yield NFTs</span>
          </div>
          <h1 className="font-display text-[30px] md:text-[42px] tracking-[-0.03em] leading-[1.05] text-[var(--ink-1)]">
            Tokenized future yield,
            <span className="block text-[var(--surge)]">styled like Conduit.</span>
          </h1>
          <p className="mt-3 max-w-[740px] font-secondary text-[15px] text-[var(--ink-2)] leading-[1.7]">
            Package future stream rights into tradeable NFTs for eligible users. Same paper aesthetic, same low-friction flow, and transparent payout metadata.
          </p>
        </header>

        <section className="nft-item grid md:grid-cols-[1.25fr_1fr] gap-6 mb-8">
          <div className="paper-card-elevated p-6 md:p-8 border-t-[2px] border-t-[var(--surge)]">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-4)] mb-4">Live Snapshot</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-[var(--ink-4)] mb-1">Collections</div>
                <div className="font-display text-[26px] text-[var(--ink-1)]">12</div>
              </div>
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-[var(--ink-4)] mb-1">24h Volume</div>
                <div className="font-display text-[26px] text-[var(--ink-1)]">$48K</div>
              </div>
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-[var(--ink-4)] mb-1">Avg Yield</div>
                <div className="font-display text-[26px] text-[var(--surge)]">5.9%</div>
              </div>
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-[var(--ink-4)] mb-1">Settlement</div>
                <div className="font-display text-[26px] text-[var(--ink-1)]">Stellar</div>
              </div>
            </div>
          </div>

          <div className="paper-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-[var(--rose)]" />
              <h2 className="font-display text-[20px] text-[var(--ink-1)]">Access Rules</h2>
            </div>
            <ul className="space-y-3 font-secondary text-[14px] text-[var(--ink-2)] leading-[1.6]">
              <li>Accredited investor gating on mint and transfer.</li>
              <li>Compliance metadata embedded in each token record.</li>
              <li>Real-time stream preview before purchase confirmation.</li>
            </ul>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {NFT_YIELDS.map((item) => (
            <article
              key={item.id}
              className="nft-item paper-card p-6 border-t-[2px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
              style={{ borderTopColor: item.accent }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-2)] mb-1">{item.box}</div>
                  <h3 className="font-display text-[20px] tracking-[-0.02em] text-[var(--ink-1)]">{item.name}</h3>
                </div>
                <Sparkles size={15} className="text-[var(--ink-2)]" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-mono text-[10px] uppercase text-[var(--ink-2)]">Yield Rights</div>
                  <div className="font-display text-[34px] leading-none tracking-[-0.03em]" style={{ color: item.accent }}>
                    {item.yield}
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--paper-edge)] flex items-center justify-between">
                  <div>
                    <div className="text-mono text-[10px] uppercase text-[var(--ink-2)]">Floor</div>
                    <div className="font-secondary text-[15px] text-[var(--ink-1)]">{item.floor}</div>
                  </div>
                  <button className="px-3 py-2 rounded-[var(--r-md)] bg-[var(--surge)] hover:bg-[var(--surge-mid)] text-[12px] font-display text-white transition-colors inline-flex items-center gap-1">
                    View <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppLayout>
  );
}

