import React, { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Trophy, TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const LEADERBOARD_DATA = [
  { rank: 1, name: 'Alpha Yield Fund', manager: '0x7a...3f9', apy: '12.4%', tvl: '$2.4M', trend: 'up', change: '+1.2%' },
  { rank: 2, name: 'Treasury Plus', manager: '0x1b...8c2', apy: '8.1%', tvl: '$15.1M', trend: 'up', change: '+0.4%' },
  { rank: 3, name: 'Emerging Markets Debt', manager: '0x9d...4e1', apy: '14.2%', tvl: '$850K', trend: 'down', change: '-0.8%' },
  { rank: 4, name: 'Corporate High Yield', manager: '0x3c...2a5', apy: '9.5%', tvl: '$4.2M', trend: 'up', change: '+0.1%' },
  { rank: 5, name: 'Defi Stable Income', manager: '0x5e...9b4', apy: '11.0%', tvl: '$1.1M', trend: 'up', change: '+2.5%' },
  { rank: 6, name: 'Global Sovereign', manager: '0x8f...1d7', apy: '6.5%', tvl: '$22.5M', trend: 'down', change: '-0.2%' },
  { rank: 7, name: 'Muni Tax-Free', manager: '0x2a...6c8', apy: '5.2%', tvl: '$8.9M', trend: 'up', change: '+0.05%' },
  { rank: 8, name: 'Green Energy Bonds', manager: '0x4b...7e3', apy: '7.8%', tvl: '$3.5M', trend: 'up', change: '+0.6%' },
];

export function Race() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.race-item',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,transform,visibility' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto" ref={containerRef}>
        <header className="mb-8 race-item flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-display font-medium text-[var(--ink-1)] tracking-tight">
              The Yield Race
            </h1>
            <p className="text-[var(--ink-3)] font-secondary mt-1 text-[15px]">
              Top performing portfolios and strategies across the network.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] px-4 py-2 rounded-[var(--r-md)] flex items-center gap-3">
              <Activity size={16} className="text-[var(--surge)]" />
              <div>
                <div className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider">Total Value Locked</div>
                <div className="font-display font-medium text-[14px] text-[var(--ink-1)]">$58.5M</div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] overflow-hidden race-item">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--paper-edge)] bg-[var(--paper-2)]">
                  <th className="py-4 px-6 font-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider font-medium w-16">Rank</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider font-medium">Portfolio / Strategy</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider font-medium">Manager</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider font-medium text-right">TVL</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider font-medium text-right">30D APY</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-[var(--ink-4)] uppercase tracking-wider font-medium text-right">24h Change</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD_DATA.map((item, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-[var(--paper-edge)] last:border-0 hover:bg-[var(--paper-2)] transition-colors group cursor-pointer race-item"
                  >
                    <td className="py-4 px-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12px] font-medium ${
                        item.rank === 1 ? 'bg-[var(--amber-pale)] text-[var(--amber)] border border-[var(--amber-pale-2)]' :
                        item.rank === 2 ? 'bg-[var(--paper-3)] text-[var(--ink-2)] border border-[var(--paper-edge)]' :
                        item.rank === 3 ? 'bg-[var(--orange-pale)] text-[var(--orange)] border border-[var(--orange-pale-2)]' :
                        'text-[var(--ink-3)]'
                      }`}>
                        {item.rank === 1 ? <Trophy size={14} /> : item.rank}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-display font-medium text-[15px] text-[var(--ink-1)] group-hover:text-[var(--surge)] transition-colors">
                        {item.name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-mono text-[13px] text-[var(--ink-3)] bg-[var(--paper-3)] px-2 py-1 rounded inline-block">
                        {item.manager}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-mono text-[14px] text-[var(--ink-1)]">
                        {item.tvl}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-display font-medium text-[16px] text-[var(--surge)]">
                        {item.apy}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={`flex items-center justify-end gap-1 font-mono text-[13px] ${
                        item.trend === 'up' ? 'text-[var(--surge)]' : 'text-[var(--rose)]'
                      }`}>
                        {item.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {item.change}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
