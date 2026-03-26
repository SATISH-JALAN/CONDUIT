const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── API Methods ──

export const api = {
  // Health
  health: () =>
    request<{ status: string; checks: Record<string, string> }>("/health"),

  // Auth
  connect: (wallet: string) =>
    request<{ accessToken: string; refreshToken: string; wallet: string }>(
      "/auth/connect",
      {
        method: "POST",
        body: JSON.stringify({ wallet }),
      },
    ),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; wallet: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  // Bond Boxes
  getBoxes: () => request<BondBox[]>("/boxes"),

  getBox: (id: string) =>
    request<BondBox & { contractId?: string; createdAt: string }>(
      `/boxes/${id}`,
    ),

  // Positions
  getPosition: (wallet: string) =>
    request<PositionResponse>(`/position/${wallet}`),

  seedDemo: () =>
    request<{ ok: boolean }>("/position/seed-demo", { method: "POST" }),

  // Deposit
  depositBuild: (wallet: string, box_id: string, amount: number) =>
    request<BuildTxResponse>("/deposit/build", {
      method: "POST",
      body: JSON.stringify({ wallet, box_id, amount }),
    }),

  depositSubmit: (
    wallet: string,
    box_id: string,
    amount: number,
    signedXdr: string,
  ) =>
    request<DepositSubmitResponse>("/deposit/submit", {
      method: "POST",
      body: JSON.stringify({ wallet, box_id, amount, signedXdr }),
    }),

  fundAccount: (wallet: string) =>
    request<{ ok: boolean; message: string }>("/deposit/fund", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),

  // Harvest
  harvestBuild: (wallet: string, box_id: string) =>
    request<BuildTxResponse & { amount: number; splits: SplitAllocation[] }>(
      "/harvest/build",
      {
        method: "POST",
        body: JSON.stringify({ wallet, box_id }),
      },
    ),

  harvestSubmit: (
    wallet: string,
    box_id: string,
    amount: number,
    signedXdr: string,
  ) =>
    request<HarvestSubmitResponse>("/harvest/submit", {
      method: "POST",
      body: JSON.stringify({ wallet, box_id, amount, signedXdr }),
    }),

  // Yield Split Config
  getSplitConfig: (wallet: string) =>
    request<SplitConfigResponse>(`/split/${wallet}`),

  saveSplitConfig: (wallet: string, splits: SplitConfigItem[]) =>
    request<SaveSplitResponse>("/split", {
      method: "POST",
      body: JSON.stringify({ wallet, splits }),
    }),
};

// ── Types ──

export interface BondBox {
  id: string;
  name: string;
  description: string;
  risk: "Low" | "Medium" | "High";
  apy: number;
  duration: number;
  min: number;
  type: "Government" | "Corporate" | "Sovereign";
  flag: string;
  accentColor?: string;
}

export interface PositionData {
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

export interface PositionResponse {
  wallet: string;
  totalValue: number;
  totalPrincipal: number;
  pendingYield: number;
  yieldPerSecond: number;
  yieldPerDay: number;
  avgApyBps: number;
  avgApy: number;
  positions: PositionData[];
}

export interface BuildTxResponse {
  xdr: string;
  networkPassphrase: string;
  box_id: string;
  amount: number;
}

export interface SplitConfigItem {
  destination: string;
  label: string;
  percentage: number;
}

export interface SplitAllocation extends SplitConfigItem {
  amount: number;
}

export interface SplitConfigResponse {
  wallet: string;
  splits: SplitConfigItem[];
}

export interface SaveSplitResponse {
  ok: boolean;
  wallet: string;
  splits: SplitConfigItem[];
}

export interface DepositSubmitResponse {
  ok: boolean;
  txHash: string | null;
  position: {
    wallet: string;
    box_id: string;
    principal: number;
    apy_bps: number;
    sync_ts: number;
  };
}

export interface HarvestSubmitResponse {
  ok: boolean;
  txHash: string | null;
  amount: number;
}
