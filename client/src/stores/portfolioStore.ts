import { create } from 'zustand';
import type { Anchor } from '@/lib/formula';
import {
  calculateValue,
  calculatePendingYield,
  yieldPerSecond,
  yieldPerDay,
} from '@/lib/formula';
import { api } from '@/lib/api';

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
  fetchPositions: (opts?: { quiet?: boolean }) => Promise<void>;
  updateAnchor: (anchor: Anchor) => void;
  /** Merge a live anchor from WS `ANCHOR_UPDATE` into anchors + positions (no API round-trip). */
  applyStreamAnchor: (anchor: Anchor) => void;
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

  fetchPositions: async (opts?: { quiet?: boolean }) => {
    const { wallet } = get();
    if (!wallet) return;

    const quiet = opts?.quiet === true;
    if (!quiet) set({ loading: true, error: null });

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
        ...(quiet ? {} : { loading: false }),
      });
    } catch (err: any) {
      set({ error: err.message, ...(quiet ? {} : { loading: false }) });
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

  applyStreamAnchor: (anchor: Anchor) => {
    const { anchors, positions } = get();
    if (!positions.some((p) => p.box_id === anchor.box_id)) {
      void get().fetchPositions({ quiet: true });
      return;
    }

    const now = Date.now();
    const nextAnchors = anchors.some((a) => a.box_id === anchor.box_id)
      ? anchors.map((a) => (a.box_id === anchor.box_id ? anchor : a))
      : [...anchors, anchor];

    const nextPositions = positions.map((p) => {
      if (p.box_id !== anchor.box_id) return p;
      const pendingYield = calculatePendingYield(anchor, now);
      const currentValue = calculateValue(anchor, now);
      const yps = yieldPerSecond(anchor);
      const ypd = yieldPerDay(anchor);
      const apy = anchor.apy_bps / 100;
      return {
        ...p,
        principal: anchor.principal,
        apy_bps: anchor.apy_bps,
        sync_ts: anchor.sync_ts,
        apy,
        currentValue,
        pendingYield,
        yieldPerSecond: yps,
        yieldPerDay: ypd,
      };
    });

    const totalPrincipal = nextPositions.reduce((s, p) => s + p.principal, 0);
    let weightedApyBps = 0;
    for (const p of nextPositions) {
      weightedApyBps += p.principal * p.apy_bps;
    }
    const avgApyBps =
      totalPrincipal > 0 ? Math.round(weightedApyBps / totalPrincipal) : 0;
    const avgApy = avgApyBps / 100;

    let totalYieldPerSecond = 0;
    for (const a of nextAnchors) {
      totalYieldPerSecond += yieldPerSecond(a);
    }

    let totalValue = 0;
    for (const a of nextAnchors) {
      totalValue += calculateValue(a, now);
    }

    set({
      anchors: nextAnchors,
      positions: nextPositions,
      totalPrincipal,
      totalYieldPerSecond,
      avgApy,
      totalValue: Math.round(totalValue * 10000) / 10000,
      pendingYield: Math.round((totalValue - totalPrincipal) * 10000) / 10000,
    });
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
