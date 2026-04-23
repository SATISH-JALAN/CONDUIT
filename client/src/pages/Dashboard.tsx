import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { YieldCounter } from '@/components/counter/YieldCounter';
import { TiltCard } from '@/components/ui/TiltCard';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { ConduitLoader } from '@/components/ui/ConduitLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeltaStatCard } from '@/components/ui/DeltaStatCard';
import { SplitHealthBar } from '@/components/ui/SplitHealthBar';
import { TransactionLifecyclePanel, type TransactionStep } from '@/components/ui/TransactionLifecyclePanel';
import { AppLayout } from '@/components/layout/AppLayout';
import { Pencil, ArrowUpRight, ArrowDownRight, Info, CheckCircle, ExternalLink, AlertCircle, Box } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWalletStore } from '@/stores/walletStore';
import { useSplitStore } from '@/stores/splitStore';
import { api, getAccessToken, readAccessTokenFromSession } from '@/lib/api';
import { parseAnchorUpdatePayload, ws } from '@/lib/ws';

type HarvestState = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

export function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ name: string, value: number, color: string }[]>([]);

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
    applyStreamAnchor,
    tick,
  } = usePortfolioStore();

  const {
    splits,
    setWallet: setSplitWallet,
    fetchSplitConfig,
    saveSplitConfig,
    addSplit,
    removeSplit,
    updateSplitPercentage,
    updateSplitLabel,
    updateSplitDestination,
    getTotalPercentage,
    isValid,
    saving: savingSplits,
    error: splitError,
  } = useSplitStore();

  // Route protection & Fetch positions
  useEffect(() => {
    if (!isConnected || !publicKey) {
      navigate('/onboarding');
      return;
    }

    setWallet(publicKey);
    setSplitWallet(publicKey);

    Promise.all([fetchPositions(), fetchSplitConfig(publicKey)]).finally(() => setLoading(false));
  }, [isConnected, publicKey, navigate, setWallet, setSplitWallet, fetchPositions, fetchSplitConfig]);

  // Live anchor stream (deposit / harvest) via authenticated WS — same socket as Agent COND_ACTION.
  useEffect(() => {
    if (!isConnected || !publicKey) return;
    if (!getAccessToken() && !readAccessTokenFromSession()) return;

    ws.connect(publicKey);
    const unsub = ws.onMessage((msg) => {
      if (msg.type === 'ANCHOR_UPDATE') {
        const anchor = parseAnchorUpdatePayload(msg.data);
        if (anchor) applyStreamAnchor(anchor);
        return;
      }
      if (msg.type === 'HARVEST_COMPLETE') {
        void fetchPositions({ quiet: true });
      }
    });
    return () => {
      unsub();
    };
  }, [isConnected, publicKey, applyStreamAnchor, fetchPositions]);

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

    }
  }, [loading]);

  useEffect(() => {
    const palette = ['var(--surge)', 'var(--sky)', 'var(--amber)', 'var(--violet)', 'var(--rose)'];
    setChartData(
      splits.map((split, index) => ({
        name: split.label,
        value: split.percentage,
        color: palette[index % palette.length],
      }))
    );
  }, [splits]);

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
  const totalSplitPercent = getTotalPercentage();
  const splitValid = isValid();

  return (
    <AppLayout>
      <div className="max-w-[min(100%,1060px)] mx-auto" ref={containerRef}>
        {loading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-75 bg-(--paper-2) rounded-(--r-xl)"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-50 bg-(--paper-2) rounded-(--r-xl)"></div>
              <div className="h-50 bg-(--paper-2) rounded-(--r-xl)"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stream View Hero */}
            <TiltCard className="dash-item chrome-border chrome-spinning paper-card-elevated p-8 relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div className="text-mono text-[10px] text-(--ink-4)">TOTAL BALANCE</div>
                <div className="flex items-center gap-2 text-mono text-[9px] text-(--surge)">
                  <span className="dot-live"></span> Streaming
                </div>
              </div>

              <div className="mb-4">
                <YieldCounter initialValue={totalValue || 0} ratePerSecond={totalYieldPerSecond || 0} />
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-mono text-[10px] text-(--ink-4) mb-2 uppercase">
                  <span>Live Yield</span>
                  <span>+${totalYieldPerSecond.toFixed(4)} / sec</span>
                </div>
                <div className="h-1 bg-(--paper-3) rounded-full overflow-hidden relative">
                  {totalYieldPerSecond > 0 && <div className="stream-bar-fill"></div>}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 border-t border-(--paper-edge) pt-6 mb-8">
                <DeltaStatCard 
                  label="Pending Harvest" 
                  value={`$${(pendingYield || 0).toFixed(2)}`} 
                  className="bg-(--paper-0)" 
                />
                <DeltaStatCard 
                  label="Avg APY" 
                  value={`${(avgApy || 0).toFixed(2)}%`} 
                  delta={0.42} 
                  deltaLabel="vs market"
                  className="bg-(--paper-0)" 
                />
                <DeltaStatCard 
                  label="Daily Rate" 
                  value={`$${((totalYieldPerSecond || 0) * 86400).toFixed(2)}`} 
                  className="bg-(--paper-0)" 
                />
              </div>

              <div className="flex flex-col mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <MagneticButton
                    variant="custom"
                    magneticStrength={0}
                    className={`flex-1 py-4 px-8 rounded-(--r-lg) transition-all font-display text-[16px] font-medium flex items-center justify-center gap-2 ${pendingYield <= 0
                        ? 'bg-(--paper-2) text-(--ink-4) cursor-not-allowed border border-(--paper-edge)'
                        : isHarvesting
                          ? 'bg-(--surge) text-white opacity-80 cursor-wait'
                          : harvestState === 'success'
                            ? 'bg-(--surge-pale) text-(--surge) border border-(--surge-pale-2)'
                            : harvestState === 'error'
                              ? 'bg-(--rose-pale) text-(--rose) border border-(--rose-pale-2)'
                              : 'bg-(--surge) text-white hover:brightness-110 shadow-[0_4px_14px_rgba(0,122,94,0.3)] cursor-pointer'
                      }`}
                    onClick={isHarvesting || pendingYield <= 0 ? undefined : handleHarvest}
                  >
                    {harvestState === 'building' && <><ConduitLoader size={18} variant="muted" /> Building TX...</>}
                    {harvestState === 'signing' && <><ConduitLoader size={18} variant="muted" /> Sign in Wallet...</>}
                    {harvestState === 'submitting' && <><ConduitLoader size={18} variant="muted" /> Submitting...</>}
                    {harvestState === 'success' && <><CheckCircle size={18} /> Harvested!</>}
                    {harvestState === 'error' && <><AlertCircle size={18} /> Failed — Try Again</>}
                    {harvestState === 'idle' && (pendingYield > 0 ? 'Harvest Yield' : 'Nothing to Harvest')}
                  </MagneticButton>

                  {harvestTx && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${harvestTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-mono text-[11px] text-(--surge) hover:underline uppercase tracking-wider px-4"
                    >
                      <ExternalLink size={12} /> View TX
                    </a>
                  )}
                </div>

                {harvestState !== 'idle' && (
                  <div className="mt-6">
                    <TransactionLifecyclePanel
                      currentStep={
                        harvestState === 'signing' ? 'sign' :
                        harvestState === 'submitting' ? 'submit' :
                        harvestState === 'success' || harvestState === 'error' ? 'confirm' : 'build'
                      }
                      isError={harvestState === 'error'}
                      txHash={harvestTx || undefined}
                      explorerUrl={harvestTx ? `https://stellar.expert/explorer/testnet/tx/${harvestTx}` : undefined}
                      className="bg-(--paper-0)"
                    />
                  </div>
                )}
              </div>
            </TiltCard>

            <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 xl:gap-8 items-start">
              {/* Split Config */}
              <div className="dash-item paper-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="font-display text-[18px] font-medium text-(--ink-1)">Yield Split</h3>
                  <Tooltip content="Automatically distribute your harvested yield across different wallets or pools.">
                    <Info size={14} className="text-(--ink-3) cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
                  <div className="w-40 h-40 relative shrink-0">
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
                        wrapperStyle={{ zIndex: 30 }}
                        contentStyle={{
                          backgroundColor: 'rgba(250, 250, 247, 0.92)',
                          backdropFilter: 'blur(40px)',
                          border: '1px solid rgba(213, 209, 202, 0.8)',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                        }}
                        itemStyle={{ color: 'var(--ink-1)', fontFamily: 'var(--font-secondary)', fontSize: '13px' }}
                        formatter={(value) => [`${Number(value ?? 0)}%`, 'Allocation']}
                      />
                    </PieChart>
                    {/* Inner circle for donut effect */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                      <div className="w-25 h-25 rounded-full bg-(--paper-2) shadow-inner flex items-center justify-center">
                        <span className="font-display font-medium text-[16px] text-(--ink-1)">{totalSplitPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 w-full min-w-0">
                    <div className="max-h-56 overflow-y-auto pr-1 space-y-4">
                      {splits.map((split, i) => (
                        <div key={`${split.destination}-${i}`} className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 p-4 rounded-(--r-md) bg-(--paper-1) border border-(--paper-edge) group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-3 h-3 rounded-full bg-(--surge)"></div>
                            <input
                              value={split.label}
                              onChange={(e) => updateSplitLabel(i, e.target.value)}
                              className="w-full max-w-45 font-secondary text-[15px] text-(--ink-1) bg-transparent border-b border-(--paper-edge) focus:outline-none focus:border-(--surge)"
                              maxLength={50}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              value={split.destination}
                              onChange={(e) => updateSplitDestination(i, e.target.value.toUpperCase())}
                              className="w-full sm:w-52.5 font-mono text-[11px] text-(--ink-3) bg-transparent border border-(--paper-edge) rounded-(--r-sm) px-2 py-1 focus:outline-none focus:border-(--surge)"
                            />
                            <input
                              type="number"
                              value={split.percentage}
                              onChange={(e) => updateSplitPercentage(i, Number(e.target.value))}
                              min={0}
                              max={100}
                              className="w-16 font-mono text-[13px] text-(--ink-3) bg-transparent border border-(--paper-edge) rounded-(--r-sm) px-2 py-1 focus:outline-none focus:border-(--surge)"
                            />
                            <span className="font-mono text-[12px] text-(--ink-3)">%</span>
                            <span className="font-mono text-[13px] text-(--ink-2) w-22.5 text-right">
                              ${(((totalYieldPerSecond || 0) * 86400 * split.percentage) / 100).toFixed(2)}/day
                            </span>
                            <button
                              className="text-(--ink-4) group-hover:text-(--rose) transition-colors text-[12px] px-2 py-1 border border-(--paper-edge) rounded-(--r-sm)"
                              onClick={() => removeSplit(i)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-(--paper-edge) space-y-4">
                      <SplitHealthBar 
                        items={splits.map((s, i) => ({ 
                          id: s.destination || String(i), 
                          label: s.label || `Split ${i + 1}`, 
                          percentage: s.percentage,
                          color: ['bg-(--surge)', 'bg-(--sky)', 'bg-(--amber)', 'bg-(--violet)', 'bg-(--rose)'][i % 5]
                        }))} 
                      />
                      <div className="flex items-center justify-between gap-3">
                        <button
                          className="px-3 py-2 rounded-(--r-sm) border border-(--paper-edge) text-mono text-[11px] text-(--ink-2) hover:border-(--surge)"
                          onClick={() => addSplit()}
                        >
                          Add Destination
                        </button>
                        <button
                          className={`px-4 py-2 rounded-(--r-sm) text-mono text-[11px] uppercase tracking-wider ${splitValid && !savingSplits
                              ? 'bg-(--surge) text-white'
                              : 'bg-(--paper-2) text-(--ink-4) cursor-not-allowed'
                            }`}
                          onClick={splitValid && !savingSplits ? () => saveSplitConfig() : undefined}
                        >
                          {savingSplits ? 'Saving...' : 'Save Split'}
                        </button>
                      </div>

                      {splitError && (
                        <div className="text-mono text-[11px] text-(--rose)">{splitError}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* COND Widget */}
              <div className="dash-item paper-card border-t-2 border-t-(--violet) p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[16px] font-medium text-(--ink-1)">COND Agent</h3>
                    <Tooltip content="Your AI portfolio manager. It continuously analyzes the market to optimize your yield.">
                      <Info size={14} className="text-(--ink-3) cursor-help" />
                    </Tooltip>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-(--violet-pale) text-(--violet) text-mono text-[9px] uppercase">Active</span>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-mono text-[10px] text-(--ink-4) mb-1">PERFORMANCE</div>
                    <div className="font-display text-[18px] text-(--ink-1)">+42bps vs market</div>
                  </div>
                  <div>
                    <div className="text-mono text-[10px] text-(--ink-4) mb-1">LAST ACTION</div>
                    <div className="font-secondary text-[13px] text-(--ink-2)">Rotated 5% to USDY</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-(--paper-edge)">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-mono text-[10px] text-(--rose) uppercase tracking-wider">Kill Switch</span>
                      <Tooltip content="Immediately stop all automated trading and return funds to your wallet.">
                        <Info size={10} className="text-(--rose) opacity-70 cursor-help" />
                      </Tooltip>
                    </div>
                    <button className="w-10 h-5 rounded-full bg-(--paper-edge) relative transition-colors hover:bg-(--rose-pale)">
                      <div className="absolute left-1 top-1 w-3 h-3 rounded-full bg-(--ink-4)"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="dash-item paper-card overflow-hidden">
              <div className="p-6 border-b border-(--paper-edge) flex items-center gap-2">
                <h3 className="font-display text-[18px] font-medium text-(--ink-1)">Active Holdings</h3>
                <Tooltip content="A list of all bonds currently held in your portfolio.">
                  <Info size={14} className="text-(--ink-3) cursor-help" />
                </Tooltip>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-(--paper-1) border-b border-(--paper-edge)">
                      <th className="p-4 font-mono text-[10px] text-(--ink-4) uppercase tracking-wider font-normal">Asset</th>
                      <th className="p-4 font-mono text-[10px] text-(--ink-4) uppercase tracking-wider font-normal">APY</th>
                      <th className="p-4 font-mono text-[10px] text-(--ink-4) uppercase tracking-wider font-normal">Principal</th>
                      <th className="p-4 font-mono text-[10px] text-(--ink-4) uppercase tracking-wider font-normal">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-0 border-b-0">
                          <EmptyState
                            icon={Box}
                            title="No active holdings"
                            description="Start earning up to 5% APY. Pick a strategy box and stream returns in real-time."
                            action={
                              <a href="/bonds" className="inline-flex items-center text-(--surge) font-display text-[15px] font-medium hover:underline">
                                Explore Bond Market
                              </a>
                            }
                            className="my-4"
                          />
                        </td>
                      </tr>
                    ) : (
                      positions.map((pos, i) => (
                        <tr key={i} className="border-b border-(--paper-edge) last:border-0 hover:bg-(--paper-1) transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {/* Quick mapped flag for demo sake */}
                              <span className="text-xl">
                                {pos.box_id.includes('german') ? '🇩🇪' : pos.box_id.includes('treasury') ? '🇺🇸' : '🌐'}
                              </span>
                              <span className="font-secondary text-[15px] text-(--ink-1) font-medium">
                                {pos.box_id}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[13px] text-(--surge)">
                            {pos.apy.toFixed(2)}%
                          </td>
                          <td className="p-4 font-mono text-[13px] text-(--ink-1)">
                            ${pos.principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 font-mono text-[13px] text-(--ink-1)">
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
