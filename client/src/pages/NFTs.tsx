import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransactionLifecyclePanel } from '@/components/ui/TransactionLifecyclePanel';
import { Sparkles, ShieldCheck, ArrowUpRight, Ticket } from 'lucide-react';
import { api, type BondBox, type NftAccreditationResponse, type NftItem } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function getAccent(yieldBps: number) {
  if (yieldBps >= 700) return 'var(--amber)';
  if (yieldBps >= 550) return 'var(--surge)';
  if (yieldBps >= 450) return 'var(--sky)';
  return 'var(--violet)';
}

export function NFTs() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isConnected } = useWalletStore();
  const [marketItems, setMarketItems] = React.useState<NftItem[]>([]);
  const [myItems, setMyItems] = React.useState<NftItem[]>([]);
  const [view, setView] = React.useState<'market' | 'mine'>('market');
  const [myStatus, setMyStatus] = React.useState<
    'all' | 'active' | 'redeemed' | 'transferred'
  >('active');
  const [boxes, setBoxes] = React.useState<BondBox[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [minting, setMinting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accreditation, setAccreditation] =
    React.useState<NftAccreditationResponse | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [transferNftId, setTransferNftId] = React.useState<string | null>(null);
  const [transferToWallet, setTransferToWallet] = React.useState('');
  const [mintStep, setMintStep] = React.useState<'idle' | 'build' | 'sign' | 'submit' | 'confirm' | 'error'>('idle');
  const [transferStep, setTransferStep] = React.useState<'idle' | 'build' | 'sign' | 'submit' | 'confirm' | 'error'>('idle');
  const [mintForm, setMintForm] = React.useState({
    boxId: '',
    notional: 100,
    durationDays: 365,
  });

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [market, bondBoxes] = await Promise.all([
        api.getNftMarket(30),
        api.getBoxes(),
      ]);
      setMarketItems(market.items);
      setBoxes(bondBoxes);

      if (!mintForm.boxId && bondBoxes.length > 0) {
        setMintForm((prev) => ({ ...prev, boxId: bondBoxes[0].id }));
      }

      if (isConnected) {
        const statusParam = myStatus === 'all' ? undefined : myStatus;
        const [mine, acc] = await Promise.all([
          api.getMyNfts(statusParam),
          api.getNftAccreditation().catch(() => null),
        ]);
        setMyItems(mine.items);
        setAccreditation(acc);
      } else {
        setMyItems([]);
        setAccreditation(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load NFTs.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, mintForm.boxId, myStatus]);

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

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    setView(isConnected ? 'mine' : 'market');
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    // Default to active when wallet connects.
    setMyStatus('active');
  }, [isConnected]);

  const visibleItems = useMemo(() => {
    if (view === 'mine') return myItems;
    return marketItems;
  }, [marketItems, myItems, view]);
  const avgYield =
    visibleItems.length > 0
      ? visibleItems.reduce((sum, item) => sum + item.yieldBps, 0) /
        visibleItems.length /
        100
      : 0;
  const totalNotional = visibleItems.reduce((sum, item) => sum + item.notional, 0);

  const mint = async () => {
    if (!isConnected || !mintForm.boxId || mintStep !== 'idle') return;
    setMintStep('build');
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));
      setMintStep('sign');
      await new Promise((r) => setTimeout(r, 800));
      setMintStep('submit');
      
      await api.mintNft({
        box_id: mintForm.boxId,
        notional: mintForm.notional,
        duration_days: mintForm.durationDays,
      });
      
      setMintStep('confirm');
      await refreshData();
      setTimeout(() => setMintStep('idle'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Mint failed.');
      setMintStep('error');
      setTimeout(() => setMintStep('idle'), 3000);
    }
  };

  const redeem = async (id: string) => {
    try {
      // We could add a redeemStep here as well, but keeping it simple for now or you can expand if needed.
      await api.redeemNft(id);
      await refreshData();
    } catch (err: any) {
      setError(err?.message || 'Redeem failed.');
    }
  };

  const openTransfer = (id: string) => {
    setTransferNftId(id);
    setTransferToWallet('');
    setTransferOpen(true);
    setTransferStep('idle');
    setError(null);
  };

  const closeTransfer = () => {
    setTransferOpen(false);
    setTransferNftId(null);
    setTransferToWallet('');
    setTransferStep('idle');
  };

  const transfer = async () => {
    if (!transferNftId || transferStep !== 'idle') return;
    const to = transferToWallet.trim();
    if (!to) return;

    setTransferStep('build');
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setTransferStep('sign');
      await new Promise((r) => setTimeout(r, 800));
      setTransferStep('submit');

      await api.transferNft(transferNftId, to);
      
      setTransferStep('confirm');
      await refreshData();
      setTimeout(() => closeTransfer(), 1500);
    } catch (err: any) {
      setError(err?.message || 'Transfer failed.');
      setTransferStep('error');
      setTimeout(() => setTransferStep('idle'), 3000);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-300 mx-auto" ref={containerRef}>
        {transferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={closeTransfer}
              className="absolute inset-0 bg-black/40"
              aria-label="Close transfer dialog"
            />
            <div className="relative w-full max-w-lg paper-card-elevated p-6 border border-(--paper-edge)">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-widest text-(--ink-4)">
                    Transfer NFT
                  </div>
                  <div className="font-display text-[20px] text-(--ink-1) mt-1">
                    Send to Stellar wallet
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeTransfer}
                  className="px-2 py-1 rounded-(--r-sm) border border-(--paper-edge) bg-(--paper-2) text-(--ink-2) text-[12px]"
                >
                  Close
                </button>
              </div>

              <label className="block text-mono text-[10px] uppercase tracking-wider text-(--ink-4) mb-2">
                Recipient wallet
              </label>
              <input
                value={transferToWallet}
                onChange={(e) => setTransferToWallet(e.target.value)}
                placeholder="G..."
                disabled={transferStep !== 'idle'}
                className="w-full px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[13px] text-(--ink-1) disabled:opacity-50"
              />
              <p className="mt-2 text-[12px] text-(--ink-3) font-secondary">
                Transfers are gated by accreditation on the recipient when enforcement is enabled.
              </p>

              {transferStep !== 'idle' && (
                <div className="mt-4">
                  <TransactionLifecyclePanel 
                    currentStep={transferStep === 'error' ? 'confirm' : transferStep} 
                    isError={transferStep === 'error'} 
                    errorMessage={error || undefined} 
                  />
                </div>
              )}

              <div className="mt-5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeTransfer}
                  disabled={transferStep !== 'idle' && transferStep !== 'error' && transferStep !== 'confirm'}
                  className="px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[12px] font-display text-(--ink-2) disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void transfer()}
                  disabled={!transferToWallet.trim() || transferStep !== 'idle'}
                  className="px-3 py-2 rounded-(--r-md) bg-(--surge) hover:bg-(--surge-mid) text-[12px] font-display text-white disabled:opacity-50"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="nft-item mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--paper-2) border border-(--paper-edge) mb-4">
            <Ticket size={13} className="text-(--ink-3)" />
            <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4)">Yield NFTs</span>
          </div>
          <h1 className="font-display text-[30px] md:text-[42px] tracking-[-0.03em] leading-[1.05] text-(--ink-1)">
            Tokenized future yield,
            <span className="block text-(--surge)">styled like Conduit.</span>
          </h1>
          <p className="mt-3 max-w-185 font-secondary text-[15px] text-(--ink-2) leading-[1.7]">
            Package future stream rights into tradeable NFTs for eligible users. Same paper aesthetic, same low-friction flow, and transparent payout metadata.
          </p>
          <div className="mt-4 p-3 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[13px] text-(--ink-2)">
            Demo note: this NFT flow enforces an accreditation check when enabled. For a fellowship demo, this is a simulated eligibility gate and does not represent full regulatory coverage.
          </div>
        </header>

        <section className="nft-item grid md:grid-cols-[1.25fr_1fr] gap-6 mb-8">
          <div className="paper-card-elevated p-6 md:p-8 border-t-2 border-t-(--surge)">
            <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-4">Live Snapshot</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Collections</div>
                <div className="font-display text-[26px] text-(--ink-1)">{visibleItems.length}</div>
              </div>
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Notional</div>
                <div className="font-display text-[26px] text-(--ink-1)">{formatMoney(totalNotional)}</div>
              </div>
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Avg Yield</div>
                <div className="font-display text-[26px] text-(--surge)">{avgYield.toFixed(2)}%</div>
              </div>
              <div className="paper-card p-4">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Settlement</div>
                <div className="font-display text-[26px] text-(--ink-1)">Stellar</div>
              </div>
            </div>
          </div>

          <div className="paper-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-(--rose)" />
              <h2 className="font-display text-[20px] text-(--ink-1)">Access Rules</h2>
            </div>
            <ul className="space-y-3 font-secondary text-[14px] text-(--ink-2) leading-[1.6]">
              <li>Accredited investor gating on mint and transfer.</li>
              <li>Compliance metadata embedded in each token record.</li>
              <li>Real-time stream preview before purchase confirmation.</li>
            </ul>

            {error && (
              <div className="mt-4 p-3 rounded-(--r-md) border border-(--rose) bg-(--rose)/10 text-[13px] text-(--ink-1)">
                {error}
              </div>
            )}

            {isConnected && accreditation && (
              <div className="mt-4 p-3 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[12px] text-(--ink-2)">
                <div className="text-mono text-[10px] uppercase tracking-wider text-(--ink-4) mb-1">
                  Accreditation check
                </div>
                <div>
                  {accreditation.eligible
                    ? 'Eligible for mint/transfer.'
                    : 'Not eligible for mint/transfer on this deployment.'}
                  {accreditation.verification?.fallbackReason
                    ? ` (${accreditation.verification.fallbackReason})`
                    : ''}
                </div>
              </div>
            )}

            {isConnected && (
              <div className="mt-5 pt-4 border-t border-(--paper-edge) space-y-3">
                <h3 className="font-display text-[16px] text-(--ink-1)">Mint Yield NFT</h3>
                <select
                  className="w-full px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[13px]"
                  value={mintForm.boxId}
                  onChange={(e) => setMintForm((prev) => ({ ...prev, boxId: e.target.value }))}
                >
                  {boxes.map((box) => (
                    <option key={box.id} value={box.id}>
                      {box.name} ({box.apy.toFixed(2)}%)
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={mintForm.notional}
                    onChange={(e) =>
                      setMintForm((prev) => ({
                        ...prev,
                        notional: Number.parseFloat(e.target.value || '0'),
                      }))
                    }
                    className="px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[13px]"
                    placeholder="Notional"
                  />
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={mintForm.durationDays}
                    onChange={(e) =>
                      setMintForm((prev) => ({
                        ...prev,
                        durationDays: Number.parseInt(e.target.value || '365', 10),
                      }))
                    }
                    className="px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[13px]"
                    placeholder="Duration days"
                  />
                </div>
                <button
                  type="button"
                  onClick={mint}
                  disabled={mintStep !== 'idle' || loading || (accreditation ? !accreditation.eligible : false)}
                  className="w-full px-3 py-2 rounded-(--r-md) bg-(--surge) hover:bg-(--surge-mid) text-[12px] font-display text-white disabled:opacity-50 transition-colors"
                >
                  Mint NFT
                </button>

                {mintStep !== 'idle' && (
                  <div className="mt-3">
                    <TransactionLifecyclePanel 
                      currentStep={mintStep === 'error' ? 'confirm' : mintStep} 
                      isError={mintStep === 'error'} 
                      errorMessage={error || undefined} 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="nft-item mb-6 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) p-1">
            <button
              type="button"
              onClick={() => setView('market')}
              className={`px-3 py-1.5 rounded-(--r-sm) text-[12px] font-display ${
                view === 'market'
                  ? 'bg-(--paper-1) text-(--ink-1)'
                  : 'text-(--ink-3)'
              }`}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => setView('mine')}
              disabled={!isConnected}
              className={`px-3 py-1.5 rounded-(--r-sm) text-[12px] font-display disabled:opacity-50 ${
                view === 'mine'
                  ? 'bg-(--paper-1) text-(--ink-1)'
                  : 'text-(--ink-3)'
              }`}
            >
              My NFTs
            </button>
          </div>
          {view === 'mine' && isConnected && (
            <select
              value={myStatus}
              onChange={(e) =>
                setMyStatus(
                  e.target.value as 'all' | 'active' | 'redeemed' | 'transferred',
                )
              }
              className="px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[12px] font-display text-(--ink-2)"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="transferred">Transferred</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={loading}
            className="px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[12px] font-display text-(--ink-2) disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="nft-item paper-card p-6 border-t-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
              style={{ borderTopColor: getAccent(item.yieldBps) }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-widest text-(--ink-2) mb-1">{item.boxId}</div>
                  <h3 className="font-display text-[20px] tracking-[-0.02em] text-(--ink-1)">Yield Stream #{item.id.slice(0, 8)}</h3>
                </div>
                <Sparkles size={15} className="text-(--ink-2)" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-mono text-[10px] uppercase text-(--ink-2)">Yield Rights</div>
                  <div className="font-display text-[34px] leading-none tracking-[-0.03em]" style={{ color: getAccent(item.yieldBps) }}>
                    {(item.yieldBps / 100).toFixed(2)}%
                  </div>
                </div>
                <div className="pt-4 border-t border-(--paper-edge) flex items-center justify-between">
                  <div>
                    <div className="text-mono text-[10px] uppercase text-(--ink-2)">Notional</div>
                    <div className="font-secondary text-[15px] text-(--ink-1)">{formatMoney(item.notional)}</div>
                  </div>
                  {isConnected ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-(--r-md) bg-(--surge) hover:bg-(--surge-mid) text-[12px] font-display text-white transition-colors inline-flex items-center gap-1"
                        onClick={() => redeem(item.id)}
                        disabled={item.status !== 'active'}
                      >
                        Redeem <ArrowUpRight size={13} />
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[12px] font-display text-(--ink-2)"
                        onClick={() => openTransfer(item.id)}
                        disabled={item.status !== 'active'}
                      >
                        Transfer
                      </button>
                    </div>
                  ) : (
                    <button className="px-3 py-2 rounded-(--r-md) bg-(--surge) hover:bg-(--surge-mid) text-[12px] font-display text-white transition-colors inline-flex items-center gap-1">
                      View <ArrowUpRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}

          {!loading && visibleItems.length === 0 && (
            <div className="nft-item paper-card p-6 col-span-full text-center">
              <p className="font-secondary text-[14px] text-(--ink-3)">
                {isConnected
                  ? 'No NFTs in your wallet yet. Mint one from the panel above.'
                  : 'No NFT listings available right now.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

