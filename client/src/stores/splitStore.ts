import { create } from "zustand";
import { api, type SplitConfigItem } from "@/lib/api";

interface SplitState {
  wallet: string | null;
  splits: SplitConfigItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  setWallet: (wallet: string) => void;
  fetchSplitConfig: (walletOverride?: string) => Promise<void>;
  saveSplitConfig: () => Promise<void>;
  addSplit: () => void;
  removeSplit: (index: number) => void;
  updateSplitPercentage: (index: number, percentage: number) => void;
  updateSplitLabel: (index: number, label: string) => void;
  updateSplitDestination: (index: number, destination: string) => void;
  getTotalPercentage: () => number;
  isValid: () => boolean;
}

export const useSplitStore = create<SplitState>((set, get) => ({
  wallet: null,
  splits: [],
  loading: false,
  saving: false,
  error: null,

  setWallet: (wallet: string) => set({ wallet }),

  fetchSplitConfig: async (walletOverride?: string) => {
    const stateWallet = get().wallet;
    const wallet = walletOverride ?? stateWallet;
    if (!wallet) return;

    set({ loading: true, error: null });
    try {
      const res = await api.getSplitConfig(wallet);
      set({ splits: res.splits, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  saveSplitConfig: async () => {
    const { wallet, splits } = get();
    if (!wallet) return;

    if (splits.reduce((sum, split) => sum + split.percentage, 0) !== 100) {
      set({ error: "Split percentages must sum to 100" });
      return;
    }

    set({ saving: true, error: null });
    try {
      const res = await api.saveSplitConfig(wallet, splits);
      set({ splits: res.splits, saving: false });
    } catch (err: any) {
      set({ error: err.message, saving: false });
    }
  },

  addSplit: () => {
    const { splits, wallet } = get();
    if (splits.length >= 10) return;

    set({
      splits: [
        ...splits,
        {
          destination: wallet ?? "",
          label: `Destination ${splits.length + 1}`,
          percentage: 1,
        },
      ],
    });
  },

  removeSplit: (index: number) => {
    const { splits } = get();
    if (splits.length <= 1) return;
    set({ splits: splits.filter((_, i) => i !== index) });
  },

  updateSplitPercentage: (index: number, percentage: number) => {
    const { splits } = get();
    const next = [...splits];
    next[index] = {
      ...next[index],
      percentage: Math.max(0, Math.min(100, Math.floor(percentage))),
    };
    set({ splits: next });
  },

  updateSplitLabel: (index: number, label: string) => {
    const { splits } = get();
    const next = [...splits];
    next[index] = { ...next[index], label };
    set({ splits: next });
  },

  updateSplitDestination: (index: number, destination: string) => {
    const { splits } = get();
    const next = [...splits];
    next[index] = { ...next[index], destination };
    set({ splits: next });
  },

  getTotalPercentage: () =>
    get().splits.reduce((sum, split) => sum + split.percentage, 0),

  isValid: () => {
    const { splits } = get();
    if (splits.length === 0 || splits.length > 10) return false;
    const total = splits.reduce((sum, split) => sum + split.percentage, 0);
    return total === 100;
  },
}));
