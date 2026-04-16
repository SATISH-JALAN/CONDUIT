import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Trophy, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useRaceStore } from '@/stores/raceStore';
import { useWalletStore } from '@/stores/walletStore';
import { api } from '@/lib/api';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCountdown(endAtIso: string | null, nowMs: number) {
  if (!endAtIso) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00' };
  }

  const end = new Date(endAtIso).getTime();
  const remaining = Math.max(0, end - nowMs);

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export function Race() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const period = '4d' as const;
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [copyingWallet, setCopyingWallet] = useState<string | null>(null);

  const {
    leaderboard,
    totalTvl,
    activeRace,
    loading,
    joining,
    fetchLeaderboard,
    fetchActiveRace,
    joinRace,
  } = useRaceStore();
  const { isConnected, publicKey } = useWalletStore();

  const countdown = useMemo(
    () => formatCountdown(activeRace?.endsAt ?? null, nowMs),
    [activeRace?.endsAt, nowMs],
  );

  useEffect(() => {
    void fetchActiveRace();
  }, [fetchActiveRace]);

  useEffect(() => {
    void fetchLeaderboard(period, 50);
  }, [fetchLeaderboard, period]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncFollowStatus = async () => {
      if (!isConnected || leaderboard.length === 0) {
        setFollowing({});
        return;
      }

      const leaders = leaderboard.map((item) => item.wallet);
      try {
        const data = await api.getFollowStatus(leaders);
        setFollowing(data.following);
      } catch {
        setFollowing({});
      }
    };

    void syncFollowStatus();
  }, [isConnected, leaderboard]);

  const onJoinRace = async () => {
    if (!isConnected) {
      navigate('/onboarding');
      return;
    }

    await joinRace();
  };

  const toggleCopy = async (leaderWallet: string) => {
    if (!isConnected || copyingWallet) {
      return;
    }

    setCopyingWallet(leaderWallet);
    try {
      if (following[leaderWallet]) {
        await api.unfollowLeader(leaderWallet);
        setFollowing((prev) => ({ ...prev, [leaderWallet]: false }));
      } else {
        await api.followLeader(leaderWallet);
        setFollowing((prev) => ({ ...prev, [leaderWallet]: true }));
      }

      await fetchLeaderboard(period, 50);
    } catch {
      // no-op
    } finally {
      setCopyingWallet(null);
    }
  };

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
      <div className="max-w-300 mx-auto" ref={containerRef}>
        <header className="mb-8 race-item flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-display font-medium text-(--ink-1) tracking-tight">
              The Yield Race
            </h1>
            <p className="text-(--ink-3) font-secondary mt-1 text-[15px]">
              Compete on APY and TVL with live rankings from on-chain portfolio data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-(--paper-1) border border-(--paper-edge) px-2 py-1 rounded-(--r-md) flex items-center gap-1">
              <span className="px-2.5 py-1 rounded-(--r-sm) text-mono text-[11px] bg-(--surge) text-white">
                4D
              </span>
            </div>
            <div className="bg-(--paper-1) border border-(--paper-edge) px-4 py-2 rounded-(--r-md) flex items-center gap-3">
              <Activity size={16} className="text-(--surge)" />
              <div>
                <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Total Value Locked</div>
                <div className="font-display font-medium text-[14px] text-(--ink-1)">{formatMoney(totalTvl)}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) overflow-hidden race-item">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-(--paper-edge) bg-(--paper-2)">
                  <th className="py-4 px-6 font-mono text-[11px] text-(--ink-4) uppercase tracking-wider font-medium w-16">Rank</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-(--ink-4) uppercase tracking-wider font-medium">Participant</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-(--ink-4) uppercase tracking-wider font-medium">Manager</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-(--ink-4) uppercase tracking-wider font-medium text-right">TVL</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-(--ink-4) uppercase tracking-wider font-medium text-right">APY</th>
                  <th className="py-4 px-6 font-mono text-[11px] text-(--ink-4) uppercase tracking-wider font-medium text-right">24h Change</th>
                </tr>
              </thead>
              <tbody>
                {loading && leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-(--ink-3) font-secondary text-[14px]">
                      Loading leaderboard...
                    </td>
                  </tr>
                )}

                {!loading && leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-(--ink-3) font-secondary text-[14px]">
                      No race participants yet. Be the first to join.
                    </td>
                  </tr>
                )}

                {leaderboard.map((item) => (
                  <tr 
                    key={`${item.wallet}-${item.rank}`} 
                    className="border-b border-(--paper-edge) last:border-0 hover:bg-(--paper-2) transition-colors group cursor-pointer race-item"
                  >
                    <td className="py-4 px-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12px] font-medium ${
                        item.rank === 1 ? 'bg-(--amber-pale) text-(--amber) border border-(--amber-pale-2)' :
                        item.rank === 2 ? 'bg-(--paper-3) text-(--ink-2) border border-(--paper-edge)' :
                        item.rank === 3 ? 'bg-(--orange-pale) text-(--orange) border border-(--orange-pale-2)' :
                        'text-(--ink-3)'
                      }`}>
                        {item.rank === 1 ? <Trophy size={14} /> : item.rank}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-display font-medium text-[15px] text-(--ink-1) group-hover:text-(--surge) transition-colors">
                        {item.displayName}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-mono text-[13px] text-(--ink-3) bg-(--paper-3) px-2 py-1 rounded inline-block mb-1">
                        {item.badge}
                      </div>
                      <div className="text-mono text-[10px] text-(--ink-4)">{item.copiedBy} copiers</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-mono text-[14px] text-(--ink-1)">
                        {formatMoney(item.tvl)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-display font-medium text-[16px] text-(--surge)">
                        {item.apy.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={`flex items-center justify-end gap-1 font-mono text-[13px] mb-2 ${
                        item.change24h >= 0 ? 'text-(--surge)' : 'text-(--rose)'
                      }`}>
                        {item.change24h >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                      </div>
                      {isConnected && publicKey !== item.wallet && (
                        <button
                          type="button"
                          onClick={() => toggleCopy(item.wallet)}
                          disabled={copyingWallet === item.wallet}
                          className="px-2 py-1 rounded-(--r-sm) text-mono text-[10px] border border-(--paper-edge) bg-(--paper-2) hover:bg-(--paper-3) disabled:opacity-50"
                        >
                          {copyingWallet === item.wallet
                            ? 'Updating...'
                            : following[item.wallet]
                              ? 'Following'
                              : 'Copy'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-4 md:p-6 race-item">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Active Race</div>
              <div className="font-display text-[22px] text-(--ink-1) mt-1">Prize Pool: {formatMoney(activeRace?.prizePool ?? 0)}</div>
              <div className="font-secondary text-[14px] text-(--ink-3) mt-1">
                Entry fee: {formatMoney(activeRace?.entryFee ?? 0)} · Participants: {activeRace?.participants ?? 0}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
              <div className="paper-card p-3 text-center"><div className="font-display text-[24px] leading-none">{countdown.days}</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Days</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[24px] leading-none">{countdown.hours}</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Hrs</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[24px] leading-none">{countdown.minutes}</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Min</div></div>
              <div className="paper-card p-3 text-center"><div className="font-display text-[24px] leading-none">{countdown.seconds}</div><div className="text-mono text-[9px] text-(--ink-4) uppercase mt-1">Sec</div></div>
            </div>

            <MagneticButton
              variant="primary"
              className="font-display text-[15px] px-5 py-3 rounded-(--r-md)"
              disabled={joining || activeRace?.joined}
              onClick={onJoinRace}
            >
              {activeRace?.joined ? 'Joined' : joining ? 'Joining...' : isConnected ? 'Join Race' : 'Connect Wallet'}
            </MagneticButton>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
