import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { YieldCounter } from '@/components/counter/YieldCounter';
import { TiltCard } from '@/components/ui/TiltCard';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { AppLayout } from '@/components/layout/AppLayout';
import { Pencil, ArrowUpRight, ArrowDownRight, Info, Loader2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWalletStore } from '@/stores/walletStore';
import { api } from '@/lib/api';

const splitData = [
  { name: 'Main Wallet', value: 70, color: 'var(--surge)' },
  { name: 'Savings Vault', value: 20, color: 'var(--sky)' },
  { name: 'Charity Pool', value: 10, color: 'var(--amber)' },
];

type HarvestState = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

export function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{name: string, value: number, color: string}[]>([]);
  
  // Harvest state
  const [harvestState, setHarvestState] = useState<HarvestState>('idle');
  const [harvestTx, setHarvestTx] = useState<string | null>(null);

  // Wallet
  const { publicKey, isConnected, signTx } = useWalletStore();

  // Portfolio store
  const {
    totalValue,
    totalPrincipal,
    pendingYield,
    totalYieldPerSecond,
    avgApy,
    positions,
    setWallet,
    fetchPositions,
    tick,
  } = usePortfolioStore();

  // Route protection & Fetch positions
  useEffect(() => {
    if (!isConnected || !publicKey) {
      navigate('/onboarding');
      return;
    }

    setWallet(publicKey);
    fetchPositions().then(() => setLoading(false));
  }, [isConnected, publicKey, navigate, setWallet, fetchPositions]);

  // Live counter tick loop
  useEffect(() => {
    if (loading) return;
    let raf: number;
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [loading, tick]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        '.dash-item',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', clearProps: 'opacity,transform,visibility' }
      );
      
      // Animate chart data drawing
      setTimeout(() => {
        setChartData(splitData);
      }, 300);
    }
  }, [loading]);

  // ── Harvest Flow ──
  const handleHarvest = async () => {
    if (!publicKey || positions.length === 0 || pendingYield <= 0) return;

    // For now, harvest the first active position with pending yield
    // A future upgrade would batch these or let users select which box to harvest
    const posToHarvest = positions.find(p => p.pendingYield > 0.0001);
    if (!posToHarvest) return;

    setHarvestState('building');
    try {
      // 1. Build
      const buildRes = await api.harvestBuild(publicKey, posToHarvest.box_id);

      // 2. Sign
      setHarvestState('signing');
      const signedXdr = await signTx(buildRes.xdr, buildRes.networkPassphrase);

      // 3. Submit
      setHarvestState('submitting');
      const submitRes = await api.harvestSubmit(publicKey, posToHarvest.box_id, buildRes.amount, signedXdr);

      setHarvestTx(submitRes.txHash);
      setHarvestState('success');

      // Refresh positions to zero out the counter
      await fetchPositions();

      // Reset UI after 5 seconds
      setTimeout(() => {
        setHarvestState('idle');
        setHarvestTx(null);
      }, 5000);

    } catch (err) {
      console.error('Harvest failed', err);
      setHarvestState('error');
      setTimeout(() => setHarvestState('idle'), 3000);
    }
  };

  const isHarvesting = ['building', 'signing', 'submitting'].includes(harvestState);

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
                <YieldCounter initialValue={totalValue || 0} ratePerSecond={totalYieldPerSecond || 0} />
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-mono text-[10px] text-[var(--ink-4)] mb-2 uppercase">
                  <span>Live Yield</span>
                  <span>+${totalYieldPerSecond.toFixed(4)} / sec</span>
                </div>
                <div className="h-[4px] bg-[var(--paper-3)] rounded-full overflow-hidden relative">
                  {totalYieldPerSecond > 0 && <div className="stream-bar-fill"></div>}
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
                  <div className="font-display text-[24px] text-[var(--ink-1)] font-medium">${(pendingYield || 0).toFixed(2)}</div>
                </div>
                <div className="border-r border-[var(--paper-edge)] pl-4">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 flex items-center gap-1">
                    Avg APY
                    <Tooltip content="Annual Percentage Yield across all active holdings.">
                      <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-[var(--ink-1)] font-medium">{(avgApy || 0).toFixed(2)}%</div>
                </div>
                <div className="pl-4">
                  <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 flex items-center gap-1">
                    Daily Rate
                    <Tooltip content="Estimated yield generated every 24 hours.">
                      <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-[var(--ink-1)] font-medium">${((totalYieldPerSecond || 0) * 86400).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <MagneticButton
                  variant="custom"
                  className={`flex-1 py-[16px] px-8 rounded-[var(--r-lg)] transition-all font-display text-[16px] font-medium flex items-center justify-center gap-2 ${
                    pendingYield <= 0
                      ? 'bg-[var(--paper-2)] text-[var(--ink-4)] cursor-not-allowed border border-[var(--paper-edge)]'
                      : isHarvesting
                      ? 'bg-[var(--surge)] text-white opacity-80 cursor-wait'
                      : harvestState === 'success'
                      ? 'bg-[var(--surge-pale)] text-[var(--surge)] border border-[var(--surge-pale-2)]'
                      : harvestState === 'error'
                      ? 'bg-[var(--rose-pale)] text-[var(--rose)] border border-[var(--rose-pale-2)]'
                      : 'bg-[var(--surge)] text-white hover:brightness-110 shadow-[0_4px_14px_rgba(0,122,94,0.3)] cursor-pointer'
                  }`}
                  onClick={isHarvesting || pendingYield <= 0 ? undefined : handleHarvest}
                >
                  {harvestState === 'building' && <><Loader2 size={18} className="animate-spin" /> Building TX...</>}
                  {harvestState === 'signing' && <><Loader2 size={18} className="animate-spin" /> Sign in Wallet...</>}
                  {harvestState === 'submitting' && <><Loader2 size={18} className="animate-spin" /> Submitting...</>}
                  {harvestState === 'success' && <><CheckCircle size={18} /> Harvested!</>}
                  {harvestState === 'error' && <><AlertCircle size={18} /> Failed — Try Again</>}
                  {harvestState === 'idle' && (pendingYield > 0 ? 'Harvest Yield' : 'Nothing to Harvest')}
                </MagneticButton>

                {harvestTx && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${harvestTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-mono text-[11px] text-[var(--surge)] hover:underline uppercase tracking-wider px-4"
                  >
                    <ExternalLink size={12} /> View TX
                  </a>
                )}
              </div>
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
                    <PieChart width={160} height={160}>
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
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">APY</th>
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">Principal</th>
                      <th className="p-4 font-mono text-[10px] text-[var(--ink-4)] uppercase tracking-wider font-normal">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[var(--ink-3)] font-secondary text-[14px]">
                          No active holdings. Head to the <a href="/bonds" className="text-[var(--surge)] hover:underline">Bond Market</a> to deposit.
                        </td>
                      </tr>
                    ) : (
                      positions.map((pos, i) => (
                        <tr key={i} className="border-b border-[var(--paper-edge)] last:border-0 hover:bg-[var(--paper-1)] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {/* Quick mapped flag for demo sake */}
                              <span className="text-xl">
                                {pos.box_id.includes('german') ? '🇩🇪' : pos.box_id.includes('treasury') ? '🇺🇸' : '🌐'}
                              </span>
                              <span className="font-secondary text-[15px] text-[var(--ink-1)] font-medium">
                                {pos.box_id}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[13px] text-[var(--surge)]">
                            {pos.apy.toFixed(2)}%
                          </td>
                          <td className="p-4 font-mono text-[13px] text-[var(--ink-1)]">
                            ${pos.principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 font-mono text-[13px] text-[var(--ink-1)]">
                            ${pos.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>
                        </tr>
                      ))
                    )}
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
