const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ACCESS_TOKEN_STORAGE_KEY = "conduit:access-token";
const REFRESH_TOKEN_STORAGE_KEY = "conduit:refresh-token";

function readSessionStorage(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (value === null) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // no-op
  }
}

let accessToken: string | null = readSessionStorage(ACCESS_TOKEN_STORAGE_KEY);
let refreshToken: string | null = readSessionStorage(REFRESH_TOKEN_STORAGE_KEY);

export function setAccessToken(token: string | null) {
  const prev = accessToken;
  accessToken = token;
  writeSessionStorage(ACCESS_TOKEN_STORAGE_KEY, token);
  if (prev !== token && typeof window !== "undefined") {
    import("./ws")
      .then((m) => m.reconnectWebSocket())
      .catch(() => {
        // ws module optional if tree-shaken in odd builds
      });
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Re-read token from session (e.g. after hydration) without relying on in-memory cache only. */
export function readAccessTokenFromSession(): string | null {
  return readSessionStorage(ACCESS_TOKEN_STORAGE_KEY);
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  writeSessionStorage(REFRESH_TOKEN_STORAGE_KEY, token);
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function clearAuthTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}

async function refreshAccessTokenIfPossible(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuthTokens();
      return false;
    }

    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) {
      clearAuthTokens();
      return false;
    }

    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const attempt = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  };

  let res = await attempt(accessToken);

  if (res.status === 401) {
    const refreshed = await refreshAccessTokenIfPossible();
    if (refreshed) {
      res = await attempt(accessToken);
    }
  }

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

  // Feature 5: Leaderboard & Race
  getLeaderboard: (period: LeaderboardPeriod = "7d", limit = 50) =>
    request<LeaderboardResponse>(
      `/leaderboard?period=${encodeURIComponent(period)}&limit=${limit}`,
    ),

  getActiveRace: () => request<ActiveRaceResponse>("/race/active"),

  joinRace: (raceId?: string) =>
    request<JoinRaceResponse>("/race/join", {
      method: "POST",
      body: JSON.stringify(raceId ? { raceId } : {}),
    }),

  // Feature 3: COND Agent
  getAgentStatus: () => request<AgentStatusResponse>("/agent/status"),

  updateAgentMandate: (payload: UpdateAgentMandatePayload) =>
    request<{ ok: boolean }>("/agent/mandate", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  setAgentKillSwitch: (paused: boolean) =>
    request<{ ok: boolean; paused: boolean }>("/agent/kill-switch", {
      method: "POST",
      body: JSON.stringify({ paused }),
    }),

  sendAgentMessage: (message: string) =>
    request<AgentChatResponse>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  /** COND v1: run rule engine + dry-run internal tx for the signed-in wallet. */
  runAgentEvaluate: () =>
    request<AgentEvaluateResponse>("/agent/evaluate", { method: "POST" }),

  // Feature 9: COND v2 proposals (review + approve)
  getAgentProposals: () =>
    request<AgentProposalsResponse>("/agent/proposals"),

  approveAgentProposal: (id: string) =>
    request<{ ok: boolean; id: string; status: string; submit?: unknown }>(
      `/agent/proposals/${encodeURIComponent(id)}/approve`,
      { method: "POST" },
    ),

  denyAgentProposal: (id: string) =>
    request<{ ok: boolean; id: string; status: string }>(
      `/agent/proposals/${encodeURIComponent(id)}/deny`,
      { method: "POST" },
    ),

  // Feature 4: Yield NFTs
  getNftMarket: (limit = 20) =>
    request<{ items: NftItem[] }>(`/nfts/market?limit=${limit}`),

  getMyNfts: (status?: "active" | "redeemed" | "transferred") =>
    request<{ wallet: string; items: NftItem[] }>(
      status ? `/nfts?status=${encodeURIComponent(status)}` : "/nfts",
    ),

  getNftAccreditation: () =>
    request<NftAccreditationResponse>("/nfts/accreditation"),

  mintNft: (payload: {
    box_id: string;
    notional: number;
    duration_days: number;
  }) =>
    request<{ ok: boolean; item: NftItem }>("/nfts/mint", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  redeemNft: (nft_id: string) =>
    request<{ ok: boolean; item: NftItem }>("/nfts/redeem", {
      method: "POST",
      body: JSON.stringify({ nft_id }),
    }),

  transferNft: (nft_id: string, to_wallet: string) =>
    request<{ ok: boolean; item: NftItem }>("/nfts/transfer", {
      method: "POST",
      body: JSON.stringify({ nft_id, to_wallet }),
    }),

  // Feature 5: Social copy portfolios
  getCopyingLeaders: () => request<CopyingResponse>("/social/copying"),

  getFollowStatus: (leaders: string[]) =>
    request<{ following: Record<string, boolean> }>(
      `/social/status?leaders=${encodeURIComponent(leaders.join(","))}`,
    ),

  followLeader: (leader_wallet: string) =>
    request<{ ok: boolean; leaderWallet: string; active: boolean }>(
      "/social/copy",
      {
        method: "POST",
        body: JSON.stringify({ leader_wallet }),
      },
    ),

  unfollowLeader: (leaderWallet: string) =>
    request<{ ok: boolean; leaderWallet: string; active: boolean }>(
      `/social/copy/${leaderWallet}`,
      {
        method: "DELETE",
      },
    ),

  // Feature 7: Creator Pools
  getCreatorPools: () => request<{ pools: CreatorPoolSummary[] }>("/creators/pools"),

  getCreatorPool: (id: string) =>
    request<{ pool: CreatorPoolSummary }>(`/creators/pools/${encodeURIComponent(id)}`),

  joinCreatorPool: (id: string, deposit_amount: number) =>
    request<{ ok: boolean; poolId: string }>(
      `/creators/pools/${encodeURIComponent(id)}/join`,
      {
        method: "POST",
        body: JSON.stringify({ deposit_amount }),
      },
    ),
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

export type LeaderboardPeriod = "7d" | "30d";

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  displayName: string;
  apy: number;
  tvl: number;
  change24h: number;
  badge: "Legend" | "Elite" | "Rising" | "Contender";
  copiedBy: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  asOf: string;
  totalTvl: number;
  entries: LeaderboardEntry[];
}

export interface ActiveRaceResponse {
  id: string;
  period: LeaderboardPeriod;
  entryFee: number;
  prizePool: number;
  status: "active" | "closed";
  startsAt: string;
  endsAt: string;
  participants: number;
  joined: boolean;
}

export interface JoinRaceResponse {
  ok: boolean;
  joined: boolean;
  race: ActiveRaceResponse;
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

export interface AgentStatusResponse {
  wallet: string;
  active: boolean;
  performanceBps: number;
  managedAssets: number;
  mandate: {
    riskTolerance: "Conservative" | "Moderate" | "Aggressive";
    autoCompound: boolean;
    compoundThresholdCents: number;
    minCreditRating: "AAA" | "AA" | "A" | "BBB";
    paused: boolean;
    updatedAt: string;
  };
  recentActions: Array<{
    action: string;
    reasoning: string;
    executed: boolean;
    time: string;
  }>;
}

export interface UpdateAgentMandatePayload {
  risk_tolerance?: "Conservative" | "Moderate" | "Aggressive";
  auto_compound?: boolean;
  compound_threshold_cents?: number;
  min_credit_rating?: "AAA" | "AA" | "A" | "BBB";
  paused?: boolean;
}

export interface AgentChatResponse {
  reply: string;
  action: string | null;
  mandateRisk?: "Conservative" | "Moderate" | "Aggressive";
}

export interface AgentEvaluateResponse {
  ok: boolean;
  wallet: string;
  submitted: number;
  results: Array<{
    action: string;
    status: number;
    ok: boolean;
    body: unknown;
  }>;
}

export interface AgentProposalItem {
  id: string;
  action: string;
  reasoning: string;
  confidence: number | null;
  status: "pending" | "approved" | "denied" | "submitted";
  createdAt: string;
}

export interface AgentProposalsResponse {
  wallet: string;
  proposals: AgentProposalItem[];
}

export interface NftItem {
  id: string;
  ownerWallet: string;
  boxId: string;
  notional: number;
  yieldBps: number;
  durationDays: number;
  status: "active" | "redeemed" | "transferred";
  txHash: string | null;
  mintedAt: string;
  expiresAt: string;
}

export interface NftAccreditationResponse {
  ok: boolean;
  enforceAccreditation: boolean;
  eligible: boolean;
  verification: {
    enabled: boolean;
    ok: boolean;
    method: string;
    contractId: string | null;
    latencyMs: number;
    value: boolean | null;
    error?: string;
    fallbackReason?: string;
  };
}

export interface CopyingResponse {
  wallet: string;
  leaders: Array<{
    leaderWallet: string;
    active: boolean;
    updatedAt: string;
  }>;
}

export interface CreatorPoolSummary {
  id: string;
  name: string;
  handle: string;
  creatorWallet: string;
  creatorShareBps: number;
  tone: string | null;
  blurb: string | null;
  box: {
    id: string;
    name: string;
    risk: "Low" | "Medium" | "High";
    apyBps: number;
  };
  followers: number;
  tvl: number;
  fanApyHintBps: number | null;
}
