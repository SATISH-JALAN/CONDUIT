import { create } from 'zustand';
import type { Anchor } from '@/lib/formula';
import { calculateValue, calculatePendingYield, yieldPerSecond } from '@/lib/formula';
import { api } from '@/lib/api';
import { ws } from '@/lib/ws';

interface Position {
  box_id: string;
  principal: number;
  apy_bps: number;
  apy: number;
  sync_ts: number;
  currentValue: number;
  pendingYield: number;
  yieldPerSecond: number;
  yieldPerDay: number;
}

interface PortfolioState {
  // Data
  wallet: string | null;
  anchors: Anchor[];
  totalValue: number;
  totalPrincipal: number;
  pendingYield: number;
  totalYieldPerSecond: number;
  avgApy: number;
  positions: Position[];
  loading: boolean;
  error: string | null;

  // Actions
  setWallet: (wallet: string) => void;
  fetchPositions: () => Promise<void>;
  updateAnchor: (anchor: Anchor) => void;
  tick: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  // Initial state
  wallet: null,
  anchors: [],
  totalValue: 0,
  totalPrincipal: 0,
  pendingYield: 0,
  totalYieldPerSecond: 0,
  avgApy: 0,
  positions: [],
  loading: false,
  error: null,

  setWallet: (wallet: string) => {
    set({ wallet });
  },

  fetchPositions: async () => {
    const { wallet } = get();
    if (!wallet) return;

    set({ loading: true, error: null });

    try {
      const data = await api.getPosition(wallet);
      const anchors = data.positions.map((p: Position) => ({
        principal: p.principal,
        apy_bps: p.apy_bps,
        sync_ts: p.sync_ts,
        box_id: p.box_id,
      }));

      set({
        anchors,
        totalValue: data.totalValue,
        totalPrincipal: data.totalPrincipal,
        pendingYield: data.pendingYield,
        totalYieldPerSecond: data.yieldPerSecond,
        avgApy: data.avgApy,
        positions: data.positions,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateAnchor: (newAnchor: Anchor) => {
    const { anchors } = get();
    const updated = anchors.map((a) =>
      a.box_id === newAnchor.box_id ? newAnchor : a
    );
    // If not found, add it
    if (!anchors.find((a) => a.box_id === newAnchor.box_id)) {
      updated.push(newAnchor);
    }
    set({ anchors: updated });
  },

  // Called every frame by requestAnimationFrame
  tick: () => {
    const { anchors, totalPrincipal } = get();
    if (anchors.length === 0) return;

    const now = Date.now();
    let totalValue = 0;

    for (const anchor of anchors) {
      totalValue += calculateValue(anchor, now);
    }

    set({
      totalValue: Math.round(totalValue * 10000) / 10000,
      pendingYield: Math.round((totalValue - totalPrincipal) * 10000) / 10000,
    });
  },
}));
