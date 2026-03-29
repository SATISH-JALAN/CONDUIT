import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, ArrowUpRight, Users, Wallet } from 'lucide-react';
import { CREATOR_POOLS } from '@/pages/Creators';

export function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const pool = CREATOR_POOLS.find((item) => item.id === id);

  return (
    <AppLayout>
      <div className="max-w-250 mx-auto">
        <Link to="/creators" className="inline-flex items-center gap-2 text-[13px] text-(--ink-3) hover:text-(--ink-1) mb-6">
          <ArrowLeft size={14} /> Back to Creator Pools
        </Link>

        {!pool ? (
          <div className="paper-card p-8">
            <h1 className="font-display text-[30px] text-(--ink-1) mb-2">Creator not found</h1>
            <p className="font-secondary text-[15px] text-(--ink-3)">The requested creator pool does not exist.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="paper-card-elevated p-6 md:p-8 border-t-2" style={{ borderTopColor: pool.tone }}>
              <div className="text-mono text-[10px] uppercase tracking-[0.12em] text-(--ink-4) mb-3">Creator Pool</div>
              <h1 className="font-display text-[36px] tracking-[-0.03em] leading-none text-(--ink-1) mb-3">{pool.name}</h1>
              <p className="font-secondary text-[15px] text-(--ink-3) leading-[1.7] max-w-175">
                A yield-sharing pool where fan deposits are routed into curated bond boxes and creator revenue is paid from realized stream yield.
              </p>
            </section>

            <section className="grid md:grid-cols-4 gap-4">
              <div className="paper-card p-5">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Followers</div>
                <div className="font-display text-[30px] text-(--ink-1)">{pool.followers}</div>
              </div>
              <div className="paper-card p-5">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Pool TVL</div>
                <div className="font-display text-[30px] text-(--ink-1)">{pool.tvl}</div>
              </div>
              <div className="paper-card p-5">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Strategy</div>
                <div className="font-display text-[24px] text-(--ink-1)">{pool.box}</div>
              </div>
              <div className="paper-card p-5">
                <div className="text-mono text-[10px] uppercase text-(--ink-4) mb-1">Creator Share</div>
                <div className="font-display text-[30px]" style={{ color: pool.tone }}>{pool.share}</div>
              </div>
            </section>

            <section className="paper-card p-6 md:p-8">
              <h2 className="font-display text-[22px] text-(--ink-1) mb-4">Pool Mechanics</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="paper-card p-4">
                  <div className="inline-flex items-center gap-2 text-(--ink-2) mb-2"><Users size={15} /> Fan Deposits</div>
                  <p className="font-secondary text-[14px] text-(--ink-3)">Users allocate funds into this pool and receive streaming yield in real time.</p>
                </div>
                <div className="paper-card p-4">
                  <div className="inline-flex items-center gap-2 text-(--ink-2) mb-2"><Wallet size={15} /> Revenue Share</div>
                  <p className="font-secondary text-[14px] text-(--ink-3)">Creator receives a transparent share of generated yield based on the selected profile.</p>
                </div>
              </div>
              <button className="mt-5 neo-btn px-4 py-2 text-[13px] font-display text-(--ink-2) inline-flex items-center gap-1">
                Join Pool <ArrowUpRight size={13} />
              </button>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

