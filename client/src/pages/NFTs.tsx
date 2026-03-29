import React, { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sparkles, ShieldCheck, ArrowUpRight, Ticket } from 'lucide-react';
import { api, type BondBox, type NftItem } from '@/lib/api';
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
  const [boxes, setBoxes] = React.useState<BondBox[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [minting, setMinting] = React.useState(false);
  const [mintForm, setMintForm] = React.useState({
    boxId: '',
    notional: 100,
    durationDays: 365,
  });

  const refreshData = React.useCallback(async () => {
    setLoading(true);
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
        const mine = await api.getMyNfts();
        setMyItems(mine.items);
      } else {
        setMyItems([]);
      }
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [isConnected, mintForm.boxId]);

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

  const visibleItems = isConnected ? myItems : marketItems;
  const avgYield =
    visibleItems.length > 0
      ? visibleItems.reduce((sum, item) => sum + item.yieldBps, 0) /
        visibleItems.length /
        100
      : 0;
  const totalNotional = visibleItems.reduce((sum, item) => sum + item.notional, 0);

  const mint = async () => {
    if (!isConnected || !mintForm.boxId || minting) return;
    setMinting(true);

    try {
      await api.mintNft({
        box_id: mintForm.boxId,
        notional: mintForm.notional,
        duration_days: mintForm.durationDays,
      });
      await refreshData();
    } catch {
      // no-op
    } finally {
      setMinting(false);
    }
  };

  const redeem = async (id: string) => {
    try {
      await api.redeemNft(id);
      await refreshData();
    } catch {
      // no-op
    }
  };

  const transfer = async (id: string) => {
    const toWallet = window.prompt('Enter recipient Stellar wallet address');
    if (!toWallet) return;

    try {
      await api.transferNft(id, toWallet.trim());
      await refreshData();
    } catch {
      // no-op
    }
  };

  return (
    <AppLayout>
      <div className="max-w-300 mx-auto" ref={containerRef}>
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
                  disabled={minting || loading}
                  className="w-full px-3 py-2 rounded-(--r-md) bg-(--surge) hover:bg-(--surge-mid) text-[12px] font-display text-white disabled:opacity-50"
                >
                  {minting ? 'Minting...' : 'Mint NFT'}
                </button>
              </div>
            )}
          </div>
        </section>

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
                        onClick={() => transfer(item.id)}
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

