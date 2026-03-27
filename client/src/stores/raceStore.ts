import { create } from "zustand";
import {
  api,
  type ActiveRaceResponse,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/api";

interface RaceState {
  period: LeaderboardPeriod;
  leaderboard: LeaderboardEntry[];
  totalTvl: number;
  asOf: string | null;
  activeRace: ActiveRaceResponse | null;
  loading: boolean;
  loadingRace: boolean;
  joining: boolean;
  error: string | null;

  fetchLeaderboard: (
    period?: LeaderboardPeriod,
    limit?: number,
  ) => Promise<void>;
  fetchActiveRace: () => Promise<void>;
  joinRace: () => Promise<void>;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  period: "7d",
  leaderboard: [],
  totalTvl: 0,
  asOf: null,
  activeRace: null,
  loading: false,
  loadingRace: false,
  joining: false,
  error: null,

  fetchLeaderboard: async (periodOverride?: LeaderboardPeriod, limit = 50) => {
    const period = periodOverride ?? get().period;
    set({ loading: true, error: null, period });

    try {
      const data = await api.getLeaderboard(period, limit);
      set({
        leaderboard: data.entries,
        totalTvl: data.totalTvl,
        asOf: data.asOf,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || "Failed to load leaderboard",
        loading: false,
      });
    }
  },

  fetchActiveRace: async () => {
    set({ loadingRace: true, error: null });

    try {
      const race = await api.getActiveRace();
      set({ activeRace: race, loadingRace: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to load active race",
        loadingRace: false,
      });
    }
  },

  joinRace: async () => {
    const activeRace = get().activeRace;
    if (!activeRace) return;

    set({ joining: true, error: null });

    try {
      const result = await api.joinRace(activeRace.id);
      set({ activeRace: result.race, joining: false });
      await get().fetchLeaderboard(get().period, 50);
    } catch (err: any) {
      set({ error: err.message || "Failed to join race", joining: false });
    }
  },
}));
