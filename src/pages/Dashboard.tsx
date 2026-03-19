import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { YieldCounter } from '@/components/counter/YieldCounter';
import { TiltCard } from '@/components/ui/TiltCard';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { AppLayout } from '@/components/layout/AppLayout';
import { Pencil, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip } from '@/components/ui/Tooltip';

const splitData = [
  { name: 'Main Wallet', value: 70, color: 'var(--surge)' },
  { name: 'Savings Vault', value: 20, color: 'var(--sky)' },
  { name: 'Charity Pool', value: 10, color: 'var(--amber)' },
];

export function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{name: string, value: number, color: string}[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        '.dash-item',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      );
      
      // Animate chart data drawing
      setTimeout(() => {
        setChartData(splitData);
      }, 300);
    }
  }, [loading]);

  return (
    <AppLayout>
      <div className="max-w-[1000px] mx-auto" ref={containerRef}>
        {loading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-[300px] bg-[var(--paper-2)] rounded-[var(--r-xl)]"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-[200px] bg-[var(--paper-2)] rounded-[var(--r-xl)]"></div>
              <div className="h-[200px] bg-[var(--paper-2)] rounded-[var(--r-xl)]"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stream View Hero */}
            <TiltCard className="dash-item chrome-border chrome-spinning paper-card-elevated p-8 relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div className="text-mono text-[10px] text-[var(--ink-4)]">TOTAL BALANCE</div>
                <div className="flex items-center gap-2 text-mono text-[9px] text-[var(--surge)]">
                  <span className="dot-live"></span> Streaming
                </div>
              </div>

              <div className="mb-4">
                <YieldCounter initialValue={50000} ratePerSecond={0.0082} />
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-mono text-[10px] text-[var(--ink-4)] mb-2 uppercase">
                  <span>Live Yield</span>
                  <span>+$0.0082 / sec</span>
                </div>
                <div className="h-[4px] bg-[var(--paper-3)] rounded-full overflow-hidden">
                  <div className="stream-bar-fill"></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-[var(--paper-edge)] pt-6 mb-8">
                <div className="border-r border-[var(--paper-edge)]">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 flex items-center gap-1">
                    Pending Harvest
                    <Tooltip content="Yield accrued but not yet claimed to your wallet.">
                      <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-[var(--ink-1)] font-medium">$42.50</div>
                </div>
                <div className="border-r border-[var(--paper-edge)] pl-4">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 flex items-center gap-1">
                    Avg APY
                    <Tooltip content="Annual Percentage Yield across all active holdings.">
                      <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-[var(--ink-1)] font-medium">5.21%</div>
                </div>
                <div className="pl-4">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 flex items-center gap-1">
                    Daily Rate
                    <Tooltip content="Estimated yield generated every 24 hours.">
                      <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-[var(--ink-1)] font-medium">$7.13</div>
                </div>
              </div>

              <MagneticButton variant="primary" className="w-full font-display text-[16px] py-[16px] rounded-[var(--r-lg)] transition-all shadow-[0_4px_14px_rgba(0,122,94,0.3)]">
                Harvest Yield
              </MagneticButton>
            </TiltCard>

            <div className="grid lg:grid-cols-[1fr_300px] gap-8">
              {/* Split Config */}
              <div className="dash-item paper-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="font-display text-[18px] font-medium text-[var(--ink-1)]">Yield Split</h3>
                  <Tooltip content="Automatically distribute your harvested yield across different wallets or pools.">
                    <Info size={14} className="text-[var(--ink-3)] cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex-1 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-[160px] h-[160px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1500}
                          animationEasing="ease-out"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(250, 250, 247, 0.92)', 
                            backdropFilter: 'blur(40px)',
                            border: '1px solid rgba(213, 209, 202, 0.8)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                          }}
                          itemStyle={{ color: 'var(--ink-1)', fontFamily: 'var(--font-secondary)', fontSize: '13px' }}
                          formatter={(value: number) => [`${value}%`, 'Allocation']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Inner circle for donut effect */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[100px] h-[100px] rounded-full bg-[var(--paper-2)] shadow-inner flex items-center justify-center">
                         <span className="font-display font-medium text-[16px] text-[var(--ink-1)]">100%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4 w-full">
                    {[
                      { name: 'Main Wallet', percent: 70, amount: '$4.99', color: 'bg-[var(--surge)]' },
                      { name: 'Savings Vault', percent: 20, amount: '$1.42', color: 'bg-[var(--sky)]' },
                      { name: 'Charity Pool', percent: 10, amount: '$0.71', color: 'bg-[var(--amber)]' },
                    ].map((split, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-[var(--r-md)] bg-[var(--paper-1)] border border-[var(--paper-edge)] group">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${split.color}`}></div>
                          <span className="font-secondary text-[15px] text-[var(--ink-1)]">{split.name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="font-mono text-[13px] text-[var(--ink-3)]">{split.percent}%</span>
                          <span className="font-mono text-[13px] text-[var(--ink-2)]">{split.amount}/day</span>
                          <button className="text-[var(--ink-4)] group-hover:text-[var(--surge)] transition-colors">
                            <Pencil size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COND Widget */}
              <div className="dash-item paper-card border-t-2 border-t-[var(--violet)] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[16px] font-medium text-[var(--ink-1)]">COND Agent</h3>
                    <Tooltip content="Your AI portfolio manager. It continuously analyzes the market to optimize your yield.">
                      <Info size={14} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-[var(--violet-pale)] text-[var(--violet)] text-mono text-[9px] uppercase">Active</span>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1">PERFORMANCE</div>
                    <div className="font-display text-[18px] text-[var(--ink-1)]">+42bps vs market</div>
                  </div>
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1">LAST ACTION</div>
                    <div className="font-secondary text-[13px] text-[var(--ink-2)]">Rotated 5% to USDY</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--paper-edge)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-mono text-[10px] text-[var(--rose)] uppercase tracking-wider">Kill Switch</span>
                      <Tooltip content="Immediately stop all automated trading and return funds to your wallet.">
                        <Info size={10} className="text-[var(--rose)] opacity-70 cursor-help" />
                      </Tooltip>
                    </div>
                    <button className="w-10 h-5 rounded-full bg-[var(--paper-edge)] relative transition-colors hover:bg-[var(--rose-pale)]">
                      <div className="absolute left-1 top-1 w-3 h-3 rounded-full bg-[var(--ink-4)]"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="dash-item paper-card overflow-hidden">
              <div className="p-6 border-b border-[var(--paper-edge)] flex items-center gap-2">
                <h3 className="font-display text-[18px] font-medium text-[var(--ink-1)]">Active Holdings</h3>
                <Tooltip content="A list of all bonds currently held in your portfolio.">
                  <Info size={14} className="text-[var(--ink-3)] cursor-help" />
                </Tooltip>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--paper-1)] border-b border-[var(--paper-edge)]">
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">Asset</th>
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">Rating</th>
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">APY</th>
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">Value</th>
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">24h Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { flag: '🇺🇸', name: 'US Treasury 2026', rating: 'AAA', apy: '5.21%', value: '$20,000', trend: '+0.02%', up: true },
                      { flag: '🌐', name: 'Ondo USDY', rating: 'AAA', apy: '5.10%', value: '$15,000', trend: '+0.01%', up: true },
                      { flag: '🇩🇪', name: 'German Bund 2027', rating: 'AAA', apy: '3.84%', value: '$10,000', trend: '0.00%', up: null },
                      { flag: '🍎', name: 'Apple Corp 2025', rating: 'AA+', apy: '5.68%', value: '$5,000', trend: '-0.05%', up: false },
                    ].map((asset, i) => (
                      <tr key={i} className="border-b border-[var(--paper-edge)] last:border-0 hover:bg-[var(--paper-1)] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{asset.flag}</span>
                            <span className="font-secondary text-[15px] text-[var(--ink-1)] font-medium">{asset.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Tooltip content={`Credit rating: ${asset.rating}`}>
                            <span className="px-2 py-1 rounded-[var(--r-sm)] bg-[var(--paper-3)] border border-[var(--paper-edge)] font-mono text-[11px] text-[var(--ink-2)] cursor-help">
                              {asset.rating}
                            </span>
                          </Tooltip>
                        </td>
                        <td className="p-4 font-mono text-[13px] text-[var(--surge)]">{asset.apy}</td>
                        <td className="p-4 font-mono text-[13px] text-[var(--ink-1)]">{asset.value}</td>
                        <td className="p-4">
                          <div className={`flex items-center gap-1 font-mono text-[12px] ${asset.up === true ? 'text-[var(--surge)]' : asset.up === false ? 'text-[var(--rose)]' : 'text-[var(--ink-3)]'}`}>
                            {asset.up === true && <ArrowUpRight size={14} />}
                            {asset.up === false && <ArrowDownRight size={14} />}
                            {asset.trend}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}

